<script lang="ts">
	import { ChevronLeft, ChevronRight, ChevronDown } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { DateFormatter, getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import { onMount } from 'svelte';
	import { 
		initDb, 
		listStudents, 
		toYMD, 
		upsertAttendance, 
		getAttendanceForDate,
		recordPayment,
		getPaymentsForDate
	} from '$lib/db/client';
	import type { AttendanceStatus } from '$lib/db/schema';

	const df = new DateFormatter('en-US', {
		dateStyle: 'full'
	});

	let currentDate = $state<DateValue>(today(getLocalTimeZone()));
	let mode = $state<'attendance' | 'payment'>('attendance');
	let students = $state<{ id: number; name: string }[]>([]);
	let attendanceRecords = $state<Map<number, AttendanceStatus>>(new Map());
	let paymentRecords = $state<Map<number, boolean>>(new Map());

	const attendanceOptions = [
		{ value: 'present' as const, label: 'Present', color: 'text-status-present' },
		{ value: 'absent' as const, label: 'Absent', color: 'text-status-absent' },
		{ value: 'late' as const, label: 'Late', color: 'text-status-late' },
		{ value: 'offday' as const, label: 'Off Day', color: 'text-status-unmarked' }
	];

	onMount(async () => {
		await initDb();
		await loadData();
	});

	async function loadData() {
		students = await listStudents();
		await loadRecordsForDate();
	}

	async function loadRecordsForDate() {
		const dateStr = toYMD(currentDate.toDate(getLocalTimeZone()));
		
		if (mode === 'attendance') {
			const records = await getAttendanceForDate(dateStr);
			attendanceRecords = new Map(records.map(r => [r.student_id, r.status]));
		} else {
			const records = await getPaymentsForDate(dateStr);
			paymentRecords = new Map(records.map(r => [r.student_id, true]));
		}
	}

	async function handleAttendanceChange(studentId: number, status: AttendanceStatus) {
		const dateStr = toYMD(currentDate.toDate(getLocalTimeZone()));
		await upsertAttendance(dateStr, studentId, status);
		attendanceRecords.set(studentId, status);
		attendanceRecords = new Map(attendanceRecords);
	}

	async function handlePaymentRecord(studentId: number) {
		const dateStr = toYMD(currentDate.toDate(getLocalTimeZone()));
		// Simple payment recording - you may want to add amount input later
		await recordPayment(studentId, 0, dateStr, 'Paid');
		paymentRecords.set(studentId, true);
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

	function getStatusDisplay(studentId: number): { label: string; color: string } {
		if (mode === 'attendance') {
			const status = attendanceRecords.get(studentId);
			if (!status) return { label: 'Mark Status', color: 'text-muted-foreground' };
			const option = attendanceOptions.find(o => o.value === status);
			return { label: option?.label || 'Unknown', color: option?.color || '' };
		} else {
			const paid = paymentRecords.get(studentId);
			return paid 
				? { label: 'Paid', color: 'text-status-present' }
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
						<span class="font-semibold flex-1">{student.name}</span>

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
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						{:else}
							<Button 
								variant={paymentRecords.get(student.id) ? 'default' : 'outline'}
								class="w-36"
								onclick={() => handlePaymentRecord(student.id)}
							>
								<span class={display.color}>{display.label}</span>
							</Button>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		{/if}
	</div>
</div>

