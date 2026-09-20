<script setup lang="ts">
const label = 'packed-consumer'
</script>

<template>
  <button type="button" @click="$theme.toggle()">{{ $theme.theme }} — {{ label }}</button>
</template>
