<script setup lang="ts">
interface Anime {
  anime: string;
  character: string;
  quote: string;
}
const title = ref(useRoute().params.title);
const fetchAnimes = async () =>
  $fetch<Anime[]>("https://animechan.vercel.app/api/quotes/anime", {
    params: {
      title: title.value,
    },
  });
const { data: animes } = useAsyncData("animes", () => fetchAnimes());
const search = async () => (animes.value = await fetchAnimes());
</script>

<template>
  <main class="container">
    <h1>search anime</h1>
    <div class="grid">
      <input v-model="title" />
      <button @click="search">search</button>
    </div>
    <table>
      <tr v-for="anime in animes">
        <td>{{ anime.anime }}</td>
        <td>{{ anime.character }}</td>
        <td>{{ anime.quote }}</td>
      </tr>
    </table>
  </main>
</template>
