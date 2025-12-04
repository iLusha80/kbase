function switchView(viewName, addToHistory = true, path) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(`view-${viewName}`);
    if (target) target.classList.remove('hidden');
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-primary-600', 'bg-primary-50');
        btn.classList.add('text-slate-600');
    });
    const activeBtn = document.getElementById(`nav-${viewName}`);
    if (activeBtn) {
        activeBtn.classList.add('text-primary-600', 'bg-primary-50');
        activeBtn.classList.remove('text-slate-600');
    }
    if (addToHistory && path) history.pushState({ view: viewName }, '', path);
}

export { switchView };