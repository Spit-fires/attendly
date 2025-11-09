<script lang="ts">
	import {
		getStudent,
		getStudentAttendanceHistory,
		getStudentPayments,
		initDb,
		updateStudent,
		deleteStudent,
		listGroups
	} from '$lib/db/client';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { ArrowLeft, Edit, Trash2, ChevronDown } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Calendar } from '$lib/components/ui/calendar/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { goto } from '$app/navigation';
	import { cn } from '$lib/utils';
	import type { AttendanceStatus } from '$lib/db/schema';

	let student = $state<{ id: number; name: string; group_id: number | null; payment_amount: number } | null>(null);
	let groups = $state<{ id: number; name: string }[]>([]);
	let attendance = $state<{ date: string; status: AttendanceStatus }[]>([]);
	let payments = $state<{ date: string; amount: number; note: string }[]>([]);
	let viewMode = $state<'attendance' | 'payment'>('attendance');
	let editDialogOpen = $state(false);
	let editedName = $state('');
	let editedGroupId = $state<number | null>(null);
	let editedPaymentAmount = $state('');

	onMount(async () => {
		const id = Number($page.params.id);
		if (Number.isNaN(id)) return;
		await initDb();
		[student, groups] = await Promise.all([getStudent(id), listGroups()]);
		if (student) {
			editedName = student.name;
			editedGroupId = student.group_id;
			editedPaymentAmount = student.payment_amount.toString();
		}
		attendance = await getStudentAttendanceHistory(id);
		payments = await getStudentPayments(id);
	});

	const attendanceStats = $derived.by(() => {
		// Exclude "offday" (no class) from attendance calculations
		const classAttendance = attendance.filter((a) => a.status !== 'offday');
		const total = classAttendance.length;
		if (total === 0) return { present: 0, absent: 0, late: 0, percentage: 'N/A' };
		const present = classAttendance.filter((a) => a.status === 'present').length;
		const absent = classAttendance.filter((a) => a.status === 'absent').length;
		const late = classAttendance.filter((a) => a.status === 'late').length;
		const percentage = total > 0 ? ((present + late * 0.5) / total) * 100 : 0;
		return {
			present,
			absent,
			late,
			percentage: `${percentage.toFixed(0)}%`
		};
	});

	const lastPaid = $derived.by(() => {
		if (payments.length === 0) return 'N/A';
		// Assuming payments are sorted by date descending from the DB
		return new Date(payments[0].date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	});

	async function handleUpdate() {
		if (!student || !editedName.trim()) return;
		const payment = editedPaymentAmount ? parseFloat(editedPaymentAmount) : 0;
		await updateStudent(student.id, editedName.trim(), editedGroupId, payment);
		student.name = editedName.trim();
		student.group_id = editedGroupId;
		student.payment_amount = payment;
		editDialogOpen = false;
	}

	async function handleDelete() {
		if (!student) return;
		if (confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
			await deleteStudent(student.id);
			goto('/students');
		}
	}

	function getStatusClass(status: AttendanceStatus): string {
		switch (status) {
			case 'present':
				return 'bg-status-present text-white';
			case 'absent':
				return 'bg-status-absent text-white';
			case 'late':
				return 'bg-status-late text-white';
			case 'offday':
				return 'bg-status-unmarked text-muted-foreground';
			default:
				return '';
		}
	}

	function getStatusLabel(status: AttendanceStatus): string {
		switch (status) {
			case 'present':
				return 'Present';
			case 'absent':
				return 'Absent';
			case 'late':
				return 'Late';
			case 'offday':
				return 'No Class';
			default:
				return status;
		}
	}
</script>

{#if !student}
	<div class="flex justify-center items-center h-full">
		<p class="text-muted-foreground">Loading...</p>
	</div>
{:else}
	<div class="container mx-auto p-4 space-y-4 pb-28">
		<!-- Header -->
		<header class="flex items-center justify-between">
			<Button variant="ghost" size="icon" onclick={() => goto('/students')}>
				<ArrowLeft class="h-6 w-6" />
			</Button>
			<h1 class="text-xl font-bold truncate">{student.name}</h1>
			<Dialog.Root bind:open={editDialogOpen}>
				<Dialog.Trigger>
					<Button variant="ghost" size="icon">
						<Edit class="h-5 w-5" />
					</Button>
				</Dialog.Trigger>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Edit Student</Dialog.Title>
					</Dialog.Header>
					<div class="grid gap-4 py-4">
						<div class="grid gap-2">
							<Label for="name">Student's Full Name</Label>
							<Input id="name" bind:value={editedName} />
						</div>
						
						<div class="grid gap-2">
							<Label for="edit-group">Group</Label>
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									<Button variant="outline" class="w-full justify-between" id="edit-group">
										{editedGroupId ? groups.find(g => g.id === editedGroupId)?.name || 'No group' : 'No group'}
										<ChevronDown class="ml-2 h-4 w-4" />
									</Button>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content>
									<DropdownMenu.Item onclick={() => { editedGroupId = null; }}>
										No group
									</DropdownMenu.Item>
									{#each groups as group}
										<DropdownMenu.Item onclick={() => { editedGroupId = group.id; }}>
											{group.name}
										</DropdownMenu.Item>
									{/each}
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>

						<div class="grid gap-2">
							<Label for="edit-payment">Payment Amount per Class (৳)</Label>
							<Input 
								id="edit-payment" 
								type="number" 
								step="0.01" 
								min="0"
								bind:value={editedPaymentAmount}
								placeholder="0.00"
							/>
						</div>
					</div>
					<Dialog.Footer class="flex justify-between w-full">
						<Button variant="destructive" onclick={handleDelete}>
							<Trash2 class="mr-2 h-4 w-4" />
							Delete Student
						</Button>
						<Button onclick={handleUpdate}>Save Changes</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Root>
		</header>

		<!-- Summary Section -->
		<Card.Root>
			<Card.Content class="p-4 flex justify-around text-center">
				<div>
					<p class="text-2xl font-bold">{attendanceStats.percentage}</p>
					<p class="text-sm text-muted-foreground">Attendance</p>
				</div>
				<div>
					<p class="text-2xl font-bold">{lastPaid}</p>
					<p class="text-sm text-muted-foreground">Last Paid</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- History Toggle -->
		<div class="flex justify-center">
			<ToggleGroup.Root
				type="single"
				value={viewMode}
				onValueChange={(v) => {
					if (v) viewMode = v as typeof viewMode;
				}}
				class="w-full max-w-md"
			>
				<ToggleGroup.Item value="attendance" class="w-1/2">Attendance History</ToggleGroup.Item>
				<ToggleGroup.Item value="payment" class="w-1/2">Payment History</ToggleGroup.Item>
			</ToggleGroup.Root>
		</div>

		<!-- Content Area -->
		<div>
			{#if viewMode === 'attendance'}
				<Card.Root>
					<Card.Header>
						<Card.Title>Attendance Records</Card.Title>
					</Card.Header>
					<Card.Content class="p-0">
						<ul class="divide-y">
							{#each attendance as record (record.date)}
								<li class="p-4 flex justify-between items-center">
									<span class="font-medium">
										{new Date(record.date).toLocaleDateString('en-US', {
											year: 'numeric',
											month: 'long',
											day: 'numeric'
										})}
									</span>
									<span class={cn('px-3 py-1 rounded text-sm font-medium', getStatusClass(record.status))}>
										{getStatusLabel(record.status)}
									</span>
								</li>
							{:else}
								<p class="text-center text-muted-foreground p-10">No attendance history.</p>
							{/each}
						</ul>
					</Card.Content>
				</Card.Root>
			{:else}
				<Card.Root>
					<Card.Header>
						<Card.Title>Payment History</Card.Title>
					</Card.Header>
					<Card.Content class="p-0">
						<ul class="divide-y">
							{#each payments as p (p.date)}
								<li class="p-4 flex justify-between items-center">
									<span class="font-medium">
										{new Date(p.date).toLocaleDateString('en-US', {
											year: 'numeric',
											month: 'long',
											day: 'numeric'
										})}
									</span>
									<span class="text-green-600 font-bold">৳{p.amount}</span>
								</li>
							{:else}
								<p class="text-center text-muted-foreground p-10">No payment history.</p>
							{/each}
						</ul>
					</Card.Content>
				</Card.Root>
			{/if}
		</div>
	</div>
{/if}
