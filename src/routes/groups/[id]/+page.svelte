<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { ChevronLeft, Edit, Trash2, Plus, Users, DollarSign } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import {
		initDb,
		getGroup,
		updateGroup,
		deleteGroup,
		listStudents,
		getGroupStats
	} from '$lib/db/client';

	let groupId = $state(0);
	let group = $state<{ id: number; name: string } | null>(null);
	let students = $state<{ id: number; name: string; payment_amount: number }[]>([]);
	let stats = $state<{ totalCollected: number; studentCount: number }>({ totalCollected: 0, studentCount: 0 });
	let editDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let editName = $state('');

	onMount(async () => {
		const id = $page.params.id;
		if (!id) return;
		groupId = parseInt(id);
		await initDb();
		await loadData();
	});

	async function loadData() {
		const [grp, studs, st] = await Promise.all([
			getGroup(groupId),
			listStudents(groupId),
			getGroupStats(groupId, 30)
		]);
		group = grp;
		students = studs;
		stats = st;
		if (group) editName = group.name;
	}

	async function handleEdit() {
		if (!editName.trim() || !group) return;
		await updateGroup(groupId, editName.trim());
		editDialogOpen = false;
		await loadData();
	}

	async function handleDelete() {
		await deleteGroup(groupId);
		deleteDialogOpen = false;
		goto('/groups');
	}

	function viewStudent(id: number) {
		goto(`/students/${id}`);
	}

	function addStudent() {
		goto(`/students?group=${groupId}`);
	}
</script>

{#if group}
	<div class="container mx-auto p-4 space-y-4 pb-28">
		<!-- Header -->
		<div class="flex items-center gap-2">
			<Button variant="ghost" size="icon" onclick={() => goto('/groups')}>
				<ChevronLeft class="h-5 w-5" />
			</Button>
			<h1 class="text-2xl font-bold flex-1">{group.name}</h1>
			<Button variant="outline" size="icon" onclick={() => (editDialogOpen = true)}>
				<Edit class="h-4 w-4" />
			</Button>
			<Button variant="destructive" size="icon" onclick={() => (deleteDialogOpen = true)}>
				<Trash2 class="h-4 w-4" />
			</Button>
		</div>

		<!-- Stats Cards -->
		<div class="grid grid-cols-2 gap-3">
			<Card.Root>
				<Card.Content class="flex items-center gap-3 p-4">
					<div class="rounded-full bg-primary/10 p-3">
						<Users class="h-5 w-5 text-primary" />
					</div>
					<div>
						<p class="text-sm text-muted-foreground">Students</p>
						<p class="text-2xl font-bold">{stats.studentCount}</p>
					</div>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Content class="flex items-center gap-3 p-4">
					<div class="rounded-full bg-status-present/10 p-3">
						<DollarSign class="h-5 w-5 text-status-present" />
					</div>
					<div>
						<p class="text-sm text-muted-foreground">30-Day Total</p>
						<p class="text-2xl font-bold">৳{stats.totalCollected.toFixed(0)}</p>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Students List -->
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold">Students</h2>
			<Button size="sm" onclick={addStudent}>
				<Plus class="mr-2 h-4 w-4" />
				Add Student
			</Button>
		</div>

		{#if students.length === 0}
			<div class="text-center py-10">
				<p class="text-muted-foreground mb-4">No students in this group yet.</p>
				<Button onclick={addStudent}>
					<Plus class="mr-2 h-4 w-4" />
					Add First Student
				</Button>
			</div>
		{:else}
			<div class="grid gap-2">
				{#each students as student (student.id)}
					<Card.Root class="cursor-pointer hover:bg-accent transition-colors" onclick={() => viewStudent(student.id)}>
						<Card.Content class="flex items-center justify-between p-3">
							<div>
								<p class="font-medium">{student.name}</p>
								{#if student.payment_amount > 0}
									<p class="text-sm text-muted-foreground">৳{student.payment_amount} per class</p>
								{/if}
							</div>
							<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Edit Dialog -->
	<Dialog.Root bind:open={editDialogOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Edit Group</Dialog.Title>
			</Dialog.Header>
			<div class="grid gap-4 py-4">
				<Label for="edit-name">Group Name</Label>
				<Input
					id="edit-name"
					bind:value={editName}
					placeholder="Enter group name"
					onkeydown={(e) => {
						if (e.key === 'Enter') handleEdit();
					}}
				/>
			</div>
			<Dialog.Footer>
				<Button onclick={handleEdit}>Save Changes</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Delete Confirmation -->
	<AlertDialog.Root bind:open={deleteDialogOpen}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Delete Group?</AlertDialog.Title>
				<AlertDialog.Description>
					This will remove the group, but students in this group will NOT be deleted. They will become ungrouped students.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
				<AlertDialog.Action onclick={handleDelete}>Delete</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{:else}
	<div class="container mx-auto p-4 text-center py-10">
		<p class="text-muted-foreground">Loading...</p>
	</div>
{/if}
