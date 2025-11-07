<script lang="ts">
	import { addStudent, listStudents, initDb } from '$lib/db/client';
	import { Plus } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let name = $state('');
	let students: { id: number; name: string }[] = $state([]);
	let dialogOpen = $state(false);

	onMount(async () => {
		await initDb();
		students = await listStudents();
	});

	async function onAdd() {
		if (!name.trim()) return;
		await addStudent(name.trim());
		students = await listStudents();
		name = '';
		dialogOpen = false;
	}
</script>

<div class="container mx-auto p-4 space-y-4 pb-28">
	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">Students</h1>
	</header>

	<div class="space-y-2">
		{#if students.length === 0}
			<p class="text-center text-muted-foreground py-10">
				No students yet. Tap the '+' button to add your first student.
			</p>
		{:else}
			<ul class="space-y-2">
				{#each students as s (s.id)}
					<li>
						<Button
							variant="outline"
							class="w-full justify-start p-6 text-lg"
							onclick={() => goto(`/students/${s.id}`)}
						>
							{s.name}
						</Button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>
</div>

<!-- Add Student FAB -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Trigger>
		<Button class="fixed bottom-32 right-6 h-16 w-16 rounded-full shadow-lg" style="background-color: var(--accent);">
			<Plus class="h-8 w-8" color="#1a1a1a" />
		</Button>
	</Dialog.Trigger>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Add Student</Dialog.Title>
			<Dialog.Description>Enter the full name of the new student.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="name" class="text-right">Name</Label>
				<Input 
					id="name" 
					bind:value={name} 
					class="col-span-3" 
					onkeydown={(e) => {
						if (e.key === 'Enter') onAdd();
					}}
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button type="submit" onclick={onAdd}>Save Student</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

