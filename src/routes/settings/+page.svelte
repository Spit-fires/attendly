<script lang="ts">
	import { Upload, Download } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { exportDb, importDb } from '$lib/db/client';

	async function handleExport() {
		try {
			await exportDb();
			alert('Database exported successfully!');
		} catch (e) {
			console.error(e);
			alert('Error exporting database.');
		}
	}

	async function handleImport() {
		if (
			!confirm(
				'Are you sure you want to import data? This will overwrite all existing data.'
			)
		) {
			return;
		}
		try {
			await importDb();
			alert('Database imported successfully! The app will now reload.');
			window.location.reload();
		} catch (e) {
			console.error(e);
			alert('Error importing database.');
		}
	}
</script>

<div class="container mx-auto p-4 space-y-4 pb-28">
	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Settings</h1>
	</header>

	<Card.Root>
		<Card.Header>
			<Card.Title>Data Backup</Card.Title>
			<Card.Description>
				Save or restore all student, attendance, and payment data.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<Button onclick={handleExport} class="w-full justify-start gap-4 p-6">
				<Download class="h-5 w-5" />
				<div>
					<p class="text-left font-semibold">Export Data</p>
					<p class="text-left font-normal text-muted-foreground">
						Save all data to a backup file.
					</p>
				</div>
			</Button>
			<Button onclick={handleImport} class="w-full justify-start gap-4 p-6">
				<Upload class="h-5 w-5" />
				<div>
					<p class="text-left font-semibold">Import Data</p>
					<p class="text-left font-normal text-muted-foreground">
						Restore data from a backup file.
					</p>
				</div>
			</Button>
		</Card.Content>
	</Card.Root>
</div>
