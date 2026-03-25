<script setup lang="ts">
import { currentVersionNotes } from "../content/version-notes";

defineProps<{
  versionLabel: string;
}>();
</script>

<template>
  <section class="stack version-notes">
    <article class="panel version-notes__hero">
      <div class="version-notes__eyebrow">About</div>
      <div class="version-notes__hero-header">
        <div>
          <h3>{{ currentVersionNotes.headline }}</h3>
          <p>{{ currentVersionNotes.summary }}</p>
        </div>
        <span class="pill mono">{{ versionLabel }}</span>
      </div>
      <div class="version-notes__tags">
        <span v-for="tag in currentVersionNotes.focusTags" :key="tag" class="pill">{{ tag }}</span>
      </div>
    </article>

    <div class="about-grid version-notes__grid">
      <article class="panel">
        <h3>评测方式</h3>
        <div class="version-notes__feature-list">
          <article v-for="item in currentVersionNotes.methodology" :key="item.title" class="version-notes__feature-item">
            <strong>{{ item.title }}</strong>
            <p>{{ item.body }}</p>
          </article>
        </div>
      </article>

      <article class="panel">
        <h3>当前结果</h3>
        <ol class="version-notes__list">
          <li v-for="item in currentVersionNotes.currentResults" :key="item">{{ item }}</li>
        </ol>
      </article>
    </div>

    <article class="panel">
      <h3>接下来</h3>
      <ol class="version-notes__list version-notes__list--compact">
        <li v-for="item in currentVersionNotes.nextSteps" :key="item">{{ item }}</li>
      </ol>
    </article>
  </section>
</template>
