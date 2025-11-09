<script lang="ts">
	import { addStudent, listStudents, listGroups, initDb } from '$lib/db/client';
	import { Plus } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { ChevronDown } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let name = $state('');
	let paymentAmount = $state('');
	let selectedGroupId = $state<number | null>(null);
	let students: { id: number; name: string; group_id: number | null; payment_amount: number }[] = $state([]);
	let groups = $state<{ id: number; name: string }[]>([]);
	let dialogOpen = $state(false);

	onMount(async () => {
		await initDb();
		// Check if redirected from group detail page with group query param
		const urlParams = new URLSearchParams(window.location.search);
		const groupParam = urlParams.get('group');
		if (groupParam) {
			selectedGroupId = parseInt(groupParam);
			dialogOpen = true;
		}
		
		await loadData();
	});

	async function loadData() {
		[students, groups] = await Promise.all([listStudents(), listGroups()]);
	}

	async function onAdd() {
		if (!name.trim()) return;
		const payment = paymentAmount ? parseFloat(paymentAmount) : 0;
		await addStudent(name.trim(), selectedGroupId, payment);
		await loadData();
		name = '';
		paymentAmount = '';
		selectedGroupId = null;
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
			<Dialog.Description>Enter student details.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="name">Name</Label>
				<Input 
					id="name" 
					bind:value={name} 
					placeholder="Full name"
					onkeydown={(e) => {
						if (e.key === 'Enter') onAdd();
					}}
				/>
			</div>
			
			<div class="grid gap-2">
				<Label for="group">Group (Optional)</Label>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Button variant="outline" class="w-full justify-between" id="group">
							{selectedGroupId ? groups.find(g => g.id === selectedGroupId)?.name || 'No group' : 'No group'}
							<ChevronDown class="ml-2 h-4 w-4" />
						</Button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Item onclick={() => { selectedGroupId = null; }}>
							No group
						</DropdownMenu.Item>
						{#each groups as group}
							<DropdownMenu.Item onclick={() => { selectedGroupId = group.id; }}>
								{group.name}
							</DropdownMenu.Item>
						{/each}
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>

			<div class="grid gap-2">
				<Label for="payment">Payment Amount per Class (৳)</Label>
				<Input 
					id="payment" 
					type="number" 
					step="0.01" 
					min="0"
					bind:value={paymentAmount} 
					placeholder="0.00"
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button type="submit" onclick={onAdd}>Save Student</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

