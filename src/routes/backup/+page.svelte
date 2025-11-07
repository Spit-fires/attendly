<script lang="ts">
  import { exportBackup, importBackup, initDb } from '$lib/db/client';
  let exported: string | null = null;
  let file: File | null = null;
  let message = '';

  async function doExport() {
    await initDb();
    const data = await exportBackup();
    const json = JSON.stringify(data, null, 2);
    exported = json;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message = 'Backup exported.';
  }

  async function doImport() {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await initDb();
      await importBackup(data);
      message = 'Backup imported successfully.';
    } catch (e) {
      console.error(e);
      message = 'Import failed. Check file format.';
    }
  }
</script>

<section class="mx-auto max-w-3xl p-4 space-y-6">
  <h1 class="text-2xl font-semibold">Backup</h1>

  <div class="space-y-3 border rounded p-4">
    <h2 class="font-medium">Export</h2>
    <button class="bg-primary text-primary-foreground rounded px-3 py-2" on:click={doExport}>Export JSON</button>
    {#if exported}
      <details class="mt-2">
        <summary class="cursor-pointer text-sm text-muted-foreground">Preview</summary>
        <pre class="p-2 text-xs overflow-auto max-h-64 border rounded">{exported}</pre>
      </details>
    {/if}
  </div>

  <div class="space-y-3 border rounded p-4">
    <h2 class="font-medium">Import</h2>
    <input type="file" accept="application/json" on:change={(e) => file = (e.target as HTMLInputElement).files?.[0] ?? null} />
    <button class="border rounded px-3 py-2" on:click={doImport}>Import JSON</button>
  </div>

  {#if message}
    <p class="text-sm text-muted-foreground">{message}</p>
  {/if}
</section>
