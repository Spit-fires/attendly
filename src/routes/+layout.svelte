<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { Users, Calendar, Settings, FolderKanban } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	let { children } = $props();

	const tabs = [
		{ href: '/', label: 'Today', icon: Calendar },
		{ href: '/groups', label: 'Groups', icon: FolderKanban },
		{ href: '/students', label: 'Students', icon: Users },
		{ href: '/settings', label: 'Settings', icon: Settings }
	];
</script>

<div class="flex flex-col min-h-screen bg-background text-foreground">
	<main class="flex-1 pt-safe-top">
		{@render children?.()}
	</main>

	<footer
		class="fixed bottom-0 left-0 right-0 bg-card border-t z-50"
		style="padding-bottom: env(safe-area-inset-bottom);"
	>
		<nav class="mx-auto max-w-md flex justify-around items-center h-16">
			{#each tabs as tab}
				<a
					href={tab.href}
					class={cn(
						'flex flex-col items-center gap-1 p-2 text-muted-foreground transition-colors hover:text-primary',
						$page.url.pathname === tab.href ? 'text-primary' : ''
					)}
				>
					<tab.icon class="size-6" />
					<span class="text-xs font-medium">{tab.label}</span>
				</a>
			{/each}
		</nav>
	</footer>
</div>

<style>
	.pt-safe-top {
		padding-top: env(safe-area-inset-top);
	}
</style>

