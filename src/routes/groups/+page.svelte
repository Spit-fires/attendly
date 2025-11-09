<script lang="ts">
	import { Plus } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { onMount } from 'svelte';
	import { initDb, listGroups, addGroup } from '$lib/db/client';
	import { goto } from '$app/navigation';

	let groups = $state<{ id: number; name: string }[]>([]);
	let addDialogOpen = $state(false);
	let newGroupName = $state('');

	onMount(async () => {
		await initDb();
		await loadGroups();
	});

	async function loadGroups() {
		groups = await listGroups();
	}

	async function handleAddGroup() {
		if (!newGroupName.trim()) return;
		await addGroup(newGroupName.trim());
		newGroupName = '';
		addDialogOpen = false;
		await loadGroups();
	}

	function viewGroup(id: number) {
		goto(`/groups/${id}`);
	}
</script>

<div class="container mx-auto p-4 space-y-4 pb-28">
	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Groups</h1>
		<Dialog.Root bind:open={addDialogOpen}>
			<Dialog.Trigger>
				<Button size="icon">
					<Plus class="h-5 w-5" />
				</Button>
			</Dialog.Trigger>
			<Dialog.Content>
				<Dialog.Header>
					<Dialog.Title>Add New Group</Dialog.Title>
				</Dialog.Header>
				<div class="grid gap-4 py-4">
					<Label for="name">Group Name (e.g., "Batch 2024", "Morning Class")</Label>
					<Input
						id="name"
						bind:value={newGroupName}
						placeholder="Enter group name"
						onkeydown={(e) => {
							if (e.key === 'Enter') handleAddGroup();
						}}
					/>
				</div>
				<Dialog.Footer>
					<Button onclick={handleAddGroup}>Add Group</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	</header>

	{#if groups.length === 0}
		<div class="text-center py-10">
			<p class="text-muted-foreground mb-4">No groups yet. Create one to organize your students!</p>
			<Button onclick={() => (addDialogOpen = true)}>
				<Plus class="mr-2 h-4 w-4" />
				Create First Group
			</Button>
		</div>
	{:else}
		<div class="grid gap-3">
			{#each groups as group (group.id)}
				<Card.Root class="cursor-pointer hover:bg-accent transition-colors" onclick={() => viewGroup(group.id)}>
					<Card.Content class="flex items-center justify-between p-4">
						<div>
							<h3 class="font-semibold text-lg">{group.name}</h3>
						</div>
						<div class="text-muted-foreground">
							<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
