<script lang="ts">
	import { ChevronLeft, ChevronRight, ChevronDown } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import { onMount } from 'svelte';
	import { 
		initDb, 
		listStudents,
		listGroups,
		toYMD, 
		upsertAttendance, 
		getAttendanceForDate,
		recordPayment,
		getPaymentsForDate,
		getLastPaymentForStudent,
		deleteAttendanceForDate,
		deletePaymentForDate,
		getStudent
	} from '$lib/db/client';
	import type { AttendanceStatus } from '$lib/db/schema';

	const df = new DateFormatter('en-US', {
		dateStyle: 'full'
	});

	let currentDate = $state<DateValue>(today(getLocalTimeZone()));
	let mode = $state<'attendance' | 'payment'>('attendance');
	let selectedGroupId = $state<number | null>(null);
	let groups = $state<{ id: number; name: string }[]>([]);
	let allStudents = $state<{ id: number; name: string; group_id: number | null; payment_amount: number }[]>([]);
	let students = $derived(selectedGroupId === null ? allStudents : allStudents.filter(s => s.group_id === selectedGroupId));
	let attendanceRecords = $state<Map<number, AttendanceStatus>>(new Map());
	let paymentRecords = $state<Map<number, number>>(new Map()); // Changed to store amount instead of boolean
	let lastPayments = $state<Map<number, { date: string; amount: number }>>(new Map());
	let partialPaymentDialogOpen = $state(false);
	let partialPaymentStudentId = $state<number | null>(null);
	let partialPaymentAmount = $state('');

	const attendanceOptions = [
		{ value: 'present' as const, label: 'Present', color: 'text-status-present' },
		{ value: 'absent' as const, label: 'Absent', color: 'text-status-absent' },
		{ value: 'late' as const, label: 'Late', color: 'text-status-late' }
	];

	onMount(async () => {
		await initDb();
		await loadData();
	});

	async function loadData() {
		[allStudents, groups] = await Promise.all([listStudents(), listGroups()]);
		// Load last payment info for each student
		const lastPaymentsMap = new Map();
		for (const student of allStudents) {
			const lastPayment = await getLastPaymentForStudent(student.id);
			if (lastPayment) {
				lastPaymentsMap.set(student.id, lastPayment);
			}
		}
		lastPayments = lastPaymentsMap;
		await loadRecordsForDate();
	}

	async function loadRecordsForDate() {
		const dateStr = toYMD(currentDate.toDate(getLocalTimeZone()));
		
		if (mode === 'attendance') {
			const records = await getAttendanceForDate(dateStr);
			attendanceRecords = new Map(records.map(r => [r.student_id, r.status]));
		} else {
			const records = await getPaymentsForDate(dateStr);
			paymentRecords = new Map(records.map(r => [r.student_id, r.amount]));
		}
	}

	async function handleAttendanceChange(studentId: number, status: AttendanceStatus) {
		const dateStr = toYMD(currentDate.toDate(getLocalTimeZone()));
		const currentStatus = attendanceRecords.get(studentId);
		
		// If clicking the same status, unselect (delete the record)
		if (currentStatus === status) {
			await deleteAttendanceForDate(studentId, dateStr);
			attendanceRecords.delete(studentId);
		} else {
			// Otherwise, set the new status
			await upsertAttendance(dateStr, studentId, status);
			attendanceRecords.set(studentId, status);
		}
		attendanceRecords = new Map(attendanceRecords);
	}

	function openPartialPaymentDialog(studentId: number) {
		partialPaymentStudentId = studentId;
		const student = allStudents.find(s => s.id === studentId);
		partialPaymentAmount = student?.payment_amount?.toString() || '';
		partialPaymentDialogOpen = true;
	}

	async function handlePartialPayment() {
		if (partialPaymentStudentId === null || !partialPaymentAmount) return;
		const amount = parseFloat(partialPaymentAmount);
		if (isNaN(amount) || amount <= 0) return;
		
		const dateStr = toYMD(currentDate.toDate(getLocalTimeZone()));
		await recordPayment(partialPaymentStudentId, amount, dateStr, 'Partial Payment');
		paymentRecords.set(partialPaymentStudentId, amount);
		paymentRecords = new Map(paymentRecords);
		
		// Update last payment info
		const lastPayment = await getLastPaymentForStudent(partialPaymentStudentId);
		if (lastPayment) {
			lastPayments.set(partialPaymentStudentId, lastPayment);
			lastPayments = new Map(lastPayments);
		}
		
		partialPaymentDialogOpen = false;
		partialPaymentStudentId = null;
		partialPaymentAmount = '';
	}

	async function handlePaymentRecord(studentId: number, paid: boolean) {
		const dateStr = toYMD(currentDate.toDate(getLocalTimeZone()));
		
		if (paid) {
			// Check if student has a default payment amount
			const student = allStudents.find(s => s.id === studentId);
			if (student && student.payment_amount > 0) {
				// Record payment with student's default amount
				await recordPayment(studentId, student.payment_amount, dateStr, 'Paid');
				paymentRecords.set(studentId, student.payment_amount);
			} else {
				// Open dialog for partial payment entry
				openPartialPaymentDialog(studentId);
				return;
			}
			
			// Update last payment info
			const lastPayment = await getLastPaymentForStudent(studentId);
			if (lastPayment) {
				lastPayments.set(studentId, lastPayment);
				lastPayments = new Map(lastPayments);
			}
		} else {
			// Remove payment for this date (unpaid)
			await deletePaymentForDate(studentId, dateStr);
			paymentRecords.delete(studentId);
		}
		
		paymentRecords = new Map(paymentRecords);
	}

	function getInitials(name: string): string {
		return name
			.split(' ')
			.map(n => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}

	function formatLastPayment(studentId: number): string {
		const lastPayment = lastPayments.get(studentId);
		if (!lastPayment) return '';
		
		const paymentDate = new Date(lastPayment.date);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - paymentDate.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		
		if (diffDays === 0) return 'Today';
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays}d ago`;
		if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
		return `${Math.floor(diffDays / 30)}mo ago`;
	}

	function getStatusDisplay(studentId: number): { label: string; color: string } {
		if (mode === 'attendance') {
			const status = attendanceRecords.get(studentId);
			if (!status) return { label: 'Mark Status', color: 'text-muted-foreground' };
			const option = attendanceOptions.find(o => o.value === status);
			return { label: option?.label || 'Unknown', color: option?.color || '' };
		} else {
			const amount = paymentRecords.get(studentId);
			return amount 
				? { label: `Paid ৳${amount}`, color: 'text-status-present' }
				: { label: 'Log Payment', color: 'text-muted-foreground' };
		}
	}

	$effect(() => {
		loadRecordsForDate();
	});
</script>

<div class="container mx-auto p-4 space-y-4 pb-28">
	<!-- Header -->
	<header class="flex items-center justify-between">
		<Button variant="ghost" size="icon" onclick={() => {
			currentDate = currentDate.subtract({ days: 1 });
		}}>
			<ChevronLeft class="h-6 w-6" />
		</Button>
		<div class="text-lg font-semibold">
			{df.format(currentDate.toDate(getLocalTimeZone()))}
		</div>
		<Button variant="ghost" size="icon" onclick={() => {
			currentDate = currentDate.add({ days: 1 });
		}}>
			<ChevronRight class="h-6 w-6" />
		</Button>
	</header>

	<!-- Group Filter -->
	{#if groups.length > 0}
		<div class="flex items-center gap-2">
			<Label class="text-sm text-muted-foreground">Filter:</Label>
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<Button variant="outline" class="flex-1 justify-between">
						{selectedGroupId === null ? 'All Students' : groups.find(g => g.id === selectedGroupId)?.name || 'All Students'}
						<ChevronDown class="ml-2 h-4 w-4" />
					</Button>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<DropdownMenu.Item onclick={() => { selectedGroupId = null; }}>
						All Students
					</DropdownMenu.Item>
					{#each groups as group}
						<DropdownMenu.Item onclick={() => { selectedGroupId = group.id; }}>
							{group.name}
						</DropdownMenu.Item>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	{/if}

	<!-- Mode Toggle -->
	<div class="flex justify-center">
		<ToggleGroup.Root
			type="single"
			value={mode}
			onValueChange={(v) => {
				if (v) {
					mode = v as typeof mode;
					loadRecordsForDate();
				}
			}}
			class="w-full max-w-xs"
		>
			<ToggleGroup.Item value="attendance" class="w-1/2">Attendance</ToggleGroup.Item>
			<ToggleGroup.Item value="payment" class="w-1/2">Payment</ToggleGroup.Item>
		</ToggleGroup.Root>
	</div>

	<!-- Student List -->
	<div class="space-y-2">
		{#if students.length === 0}
			<p class="text-center text-muted-foreground py-10">
				No students yet. Tap the 'Students' tab to add your first student!
			</p>
		{:else}
			{#each students as student (student.id)}
				{@const display = getStatusDisplay(student.id)}
				<Card.Root>
					<Card.Content class="flex items-center p-4 gap-4">
						<Avatar.Root>
							<Avatar.Fallback>{getInitials(student.name)}</Avatar.Fallback>
						</Avatar.Root>
						<div class="flex-1">
							<div class="font-semibold">{student.name}</div>
							{#if mode === 'payment' && lastPayments.has(student.id)}
								<div class="text-xs text-muted-foreground">Last: {formatLastPayment(student.id)}</div>
							{/if}
						</div>

						{#if mode === 'attendance'}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									<Button variant="outline" class="w-36">
										<span class={display.color}>{display.label}</span>
										<ChevronDown class="ml-2 h-4 w-4" />
									</Button>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content>
									{#each attendanceOptions as option}
										<DropdownMenu.Item 
											onclick={() => handleAttendanceChange(student.id, option.value)}
										>
											<span class={option.color}>{option.label}</span>
										</DropdownMenu.Item>
									{/each}
									{#if attendanceRecords.has(student.id)}
										<DropdownMenu.Separator />
										<DropdownMenu.Item 
											onclick={async () => {
												const dateStr = toYMD(currentDate.toDate(getLocalTimeZone()));
												await deleteAttendanceForDate(student.id, dateStr);
												attendanceRecords.delete(student.id);
												attendanceRecords = new Map(attendanceRecords);
											}}
										>
											<span class="text-muted-foreground">Clear</span>
										</DropdownMenu.Item>
									{/if}
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{:else}
							<DropdownMenu.Root>
								<DropdownMenu.Trigger>
									<Button 
										variant={paymentRecords.get(student.id) ? 'default' : 'outline'}
										class="w-36"
									>
										<span class={display.color}>{display.label}</span>
										<ChevronDown class="ml-2 h-4 w-4" />
									</Button>
								</DropdownMenu.Trigger>
								<DropdownMenu.Content>
									<DropdownMenu.Item onclick={() => handlePaymentRecord(student.id, true)}>
										<span class="text-status-present">
											{student.payment_amount > 0 ? `Paid (৳${student.payment_amount})` : 'Paid (Enter Amount)'}
										</span>
									</DropdownMenu.Item>
									<DropdownMenu.Item onclick={() => openPartialPaymentDialog(student.id)}>
										<span class="text-status-late">Partial Payment...</span>
									</DropdownMenu.Item>
									{#if paymentRecords.has(student.id)}
										<DropdownMenu.Separator />
										<DropdownMenu.Item onclick={() => handlePaymentRecord(student.id, false)}>
											<span class="text-status-absent">Unpaid</span>
										</DropdownMenu.Item>
									{/if}
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		{/if}
	</div>
</div>

<!-- Partial Payment Dialog -->
<Dialog.Root bind:open={partialPaymentDialogOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Enter Payment Amount</Dialog.Title>
			<Dialog.Description>
				{#if partialPaymentStudentId}
					{@const student = allStudents.find(s => s.id === partialPaymentStudentId)}
					{#if student}
						Recording payment for {student.name}
					{/if}
				{/if}
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="amount">Amount (৳)</Label>
				<Input 
					id="amount" 
					type="number" 
					step="0.01" 
					min="0"
					bind:value={partialPaymentAmount}
					placeholder="Enter amount"
					onkeydown={(e) => {
						if (e.key === 'Enter') handlePartialPayment();
					}}
				/>
			</div>
		</div>
		<Dialog.Footer>
			<Button onclick={handlePartialPayment}>Record Payment</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
