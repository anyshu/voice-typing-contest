#include <CoreAudio/CoreAudio.h>
#include <CoreFoundation/CoreFoundation.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifndef kAudioObjectPropertyElementMain
#define kAudioObjectPropertyElementMain kAudioObjectPropertyElementMaster
#endif

static void print_json_string(const char *value) {
  putchar('"');
  for (const unsigned char *cursor = (const unsigned char *)value; *cursor; cursor += 1) {
    switch (*cursor) {
      case '\\':
      case '"':
        putchar('\\');
        putchar(*cursor);
        break;
      case '\n':
        fputs("\\n", stdout);
        break;
      case '\r':
        fputs("\\r", stdout);
        break;
      case '\t':
        fputs("\\t", stdout);
        break;
      default:
        putchar(*cursor);
        break;
    }
  }
  putchar('"');
}

static bool get_device_name(AudioDeviceID device_id, char *buffer, size_t buffer_size) {
  AudioObjectPropertyAddress address = {
    .mSelector = kAudioObjectPropertyName,
    .mScope = kAudioObjectPropertyScopeGlobal,
    .mElement = kAudioObjectPropertyElementMain,
  };
  CFStringRef name = NULL;
  UInt32 size = sizeof(name);
  OSStatus status = AudioObjectGetPropertyData(device_id, &address, 0, NULL, &size, &name);
  if (status != noErr || name == NULL) {
    snprintf(buffer, buffer_size, "Device %u", device_id);
    return false;
  }

  Boolean ok = CFStringGetCString(name, buffer, (CFIndex)buffer_size, kCFStringEncodingUTF8);
  CFRelease(name);
  if (!ok) {
    snprintf(buffer, buffer_size, "Device %u", device_id);
    return false;
  }
  return true;
}

static bool device_has_output(AudioDeviceID device_id) {
  AudioObjectPropertyAddress address = {
    .mSelector = kAudioDevicePropertyStreams,
    .mScope = kAudioDevicePropertyScopeOutput,
    .mElement = kAudioObjectPropertyElementMain,
  };
  UInt32 size = 0;
  OSStatus status = AudioObjectGetPropertyDataSize(device_id, &address, 0, NULL, &size);
  return status == noErr && size > 0;
}

static bool device_is_alive(AudioDeviceID device_id) {
  AudioObjectPropertyAddress address = {
    .mSelector = kAudioDevicePropertyDeviceIsAlive,
    .mScope = kAudioObjectPropertyScopeGlobal,
    .mElement = kAudioObjectPropertyElementMain,
  };
  UInt32 alive = 0;
  UInt32 size = sizeof(alive);
  OSStatus status = AudioObjectGetPropertyData(device_id, &address, 0, NULL, &size, &alive);
  return status == noErr && alive != 0;
}

static AudioDeviceID get_default_output_device(void) {
  AudioObjectPropertyAddress address = {
    .mSelector = kAudioHardwarePropertyDefaultOutputDevice,
    .mScope = kAudioObjectPropertyScopeGlobal,
    .mElement = kAudioObjectPropertyElementMain,
  };
  AudioDeviceID device_id = 0;
  UInt32 size = sizeof(device_id);
  OSStatus status = AudioObjectGetPropertyData(kAudioObjectSystemObject, &address, 0, NULL, &size, &device_id);
  if (status != noErr) {
    return 0;
  }
  return device_id;
}

static int list_devices(void) {
  AudioObjectPropertyAddress address = {
    .mSelector = kAudioHardwarePropertyDevices,
    .mScope = kAudioObjectPropertyScopeGlobal,
    .mElement = kAudioObjectPropertyElementMain,
  };
  UInt32 size = 0;
  OSStatus status = AudioObjectGetPropertyDataSize(kAudioObjectSystemObject, &address, 0, NULL, &size);
  if (status != noErr) {
    fprintf(stderr, "failed to query audio devices\n");
    return 1;
  }

  uint32_t count = size / sizeof(AudioDeviceID);
  AudioDeviceID *devices = (AudioDeviceID *)calloc(count, sizeof(AudioDeviceID));
  if (devices == NULL) {
    fprintf(stderr, "failed to allocate device buffer\n");
    return 1;
  }

  status = AudioObjectGetPropertyData(kAudioObjectSystemObject, &address, 0, NULL, &size, devices);
  if (status != noErr) {
    free(devices);
    fprintf(stderr, "failed to read audio devices\n");
    return 1;
  }

  AudioDeviceID default_device = get_default_output_device();
  fputs("{\"devices\":[", stdout);
  bool first = true;
  for (uint32_t index = 0; index < count; index += 1) {
    AudioDeviceID device_id = devices[index];
    if (!device_has_output(device_id)) {
      continue;
    }

    char name[512];
    get_device_name(device_id, name, sizeof(name));

    if (!first) {
      putchar(',');
    }
    first = false;

    fputs("{\"id\":", stdout);
    char id_buffer[32];
    snprintf(id_buffer, sizeof(id_buffer), "%u", device_id);
    print_json_string(id_buffer);
    fputs(",\"name\":", stdout);
    print_json_string(name);
    fputs(",\"available\":", stdout);
    fputs(device_is_alive(device_id) ? "true" : "false", stdout);
    fputs(",\"isDefault\":", stdout);
    fputs(device_id == default_device ? "true" : "false", stdout);
    fputs("}", stdout);
  }
  fputs("]}", stdout);

  free(devices);
  return 0;
}

static int print_default_output_device(void) {
  AudioDeviceID device_id = get_default_output_device();
  printf("%u\n", device_id);
  return device_id == 0 ? 1 : 0;
}

static int set_default_output_device(const char *raw_id) {
  AudioDeviceID device_id = (AudioDeviceID)strtoul(raw_id, NULL, 10);
  if (device_id == 0) {
    fprintf(stderr, "invalid device id: %s\n", raw_id);
    return 1;
  }

  AudioObjectPropertyAddress address = {
    .mSelector = kAudioHardwarePropertyDefaultOutputDevice,
    .mScope = kAudioObjectPropertyScopeGlobal,
    .mElement = kAudioObjectPropertyElementMain,
  };
  UInt32 size = sizeof(device_id);
  OSStatus status = AudioObjectSetPropertyData(kAudioObjectSystemObject, &address, 0, NULL, size, &device_id);
  if (status != noErr) {
    fprintf(stderr, "failed to set default output device: %d\n", status);
    return 1;
  }
  return 0;
}

int main(int argc, char **argv) {
  if (argc < 2) {
    fprintf(stderr, "usage: vtc-audioctl <list|get-default|set-default> [device-id]\n");
    return 1;
  }

  if (strcmp(argv[1], "list") == 0) {
    return list_devices();
  }
  if (strcmp(argv[1], "get-default") == 0) {
    return print_default_output_device();
  }
  if (strcmp(argv[1], "set-default") == 0 && argc >= 3) {
    return set_default_output_device(argv[2]);
  }

  fprintf(stderr, "unknown command: %s\n", argv[1]);
  return 1;
}
