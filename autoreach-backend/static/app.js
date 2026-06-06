/* -------------------------------------------------------------
 * AutoReach AI — Editorial Workspace Client Logic
 * Vanilla JavaScript Integration
 * ------------------------------------------------------------- */

// Application State
const state = {
    activeTab: 'overview',
    userId: localStorage.getItem('autoreach_user_id') || 'mohan',
    threads: [],
    drafts: [],
    selectedDraftId: null,
    selectedDraft: null,
    selectedDraftThread: null,
    staleAfterDays: 7
};

// API Endpoint configuration
const API_BASE = '/api';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initUserSelector();
    initTabNavigation();
    initAddThreadDrawer();
    initDraftSidebarFilter();
    initThreadTableFilters();
    
    // Initial data fetch
    refreshAllData();
});

// Toast Notifications System
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icon = type === 'success' 
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
        
    toast.innerHTML = `
        ${icon}
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Automatically remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// User Context Selector
function initUserSelector() {
    const input = document.getElementById('active-user-id');
    if (!input) return;
    
    input.value = state.userId;
    
    input.addEventListener('change', (e) => {
        const val = e.target.value.trim();
        if (val) {
            state.userId = val;
            localStorage.setItem('autoreach_user_id', val);
            showToast(`Operator changed to "${val}"`, 'success');
            refreshAllData();
        } else {
            input.value = state.userId;
        }
    });
}

// Tab Panels Navigation
function initTabNavigation() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    const panels = document.querySelectorAll('.tab-panel');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.getAttribute('data-tab');
            if (tab === state.activeTab) return;
            
            // Update sidebar UI
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            // Switch panels
            panels.forEach(p => p.classList.remove('active'));
            const targetPanel = document.getElementById(`panel-${tab}`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
            
            state.activeTab = tab;
            
            // Reload specific elements on tab switch
            if (tab === 'threads') {
                renderThreadsTable();
            } else if (tab === 'drafts') {
                renderDraftsList();
            }
        });
    });
    
    // Dashboard shortcut links
    document.querySelector('.view-all-drafts-btn')?.addEventListener('click', () => {
        const draftsNavItem = document.querySelector('.sidebar-nav [data-tab="drafts"]');
        if (draftsNavItem) draftsNavItem.click();
    });
}

// Register New Thread Drawer logic
function initAddThreadDrawer() {
    const drawer = document.getElementById('add-thread-drawer');
    const overlay = document.getElementById('add-thread-drawer-overlay');
    const closeBtn = document.getElementById('add-thread-drawer-close');
    const cancelBtn = document.getElementById('add-thread-drawer-cancel');
    const form = document.getElementById('add-thread-form');
    const slider = document.getElementById('form-urgency-score');
    const sliderVal = document.getElementById('form-urgency-score-val');
    const sentAtInput = document.getElementById('form-sent-at');
    
    // Toggles
    const openDrawer = () => {
        // Preset default sent time to current datetime local
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        sentAtInput.value = now.toISOString().slice(0, 16);
        
        drawer.classList.add('open');
        overlay.classList.add('open');
    };
    
    const closeDrawer = () => {
        drawer.classList.remove('open');
        overlay.classList.remove('open');
        form.reset();
        sliderVal.textContent = slider.defaultValue;
    };
    
    // Add trigger event listeners dynamically
    document.querySelectorAll('.btn-add-thread-trigger').forEach(btn => {
        btn.addEventListener('click', openDrawer);
    });
    
    closeBtn.addEventListener('click', closeDrawer);
    cancelBtn.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', closeDrawer);
    
    // Slider label updates
    slider.addEventListener('input', (e) => {
        sliderVal.textContent = e.target.value;
    });
    
    // Submit handling
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            user_id: state.userId,
            recipient_name: document.getElementById('form-recipient-name').value.trim(),
            recipient_email: document.getElementById('form-recipient-email').value.trim(),
            subject: document.getElementById('form-subject').value.trim(),
            original_body: document.getElementById('form-original-body').value.trim(),
            sent_at: new Date(sentAtInput.value).toISOString(),
            intent_tag: document.getElementById('form-intent-tag').value,
            urgency_score: parseInt(slider.value)
        };
        
        try {
            const response = await fetch(`${API_BASE}/threads/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Could not register thread.');
            }
            
            showToast('Outbound conversation registered successfully.', 'success');
            closeDrawer();
            refreshAllData();
        } catch (error) {
            console.error(error);
            showToast(error.message, 'danger');
        }
    });
}

// Thread Tab Filtering & Search
let activeThreadFilter = 'all';
function initThreadTableFilters() {
    const chips = document.querySelectorAll('[data-thread-status]');
    const searchInput = document.getElementById('threads-search-input');
    
    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            chips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            activeThreadFilter = chip.getAttribute('data-thread-status');
            renderThreadsTable();
        });
    });
    
    searchInput.addEventListener('input', () => {
        renderThreadsTable();
    });
}

// Draft Tab Filtering
let activeDraftFilter = 'pending';
function initDraftSidebarFilter() {
    const subButtons = document.querySelectorAll('.draft-sidebar-filter .tab-sub-btn');
    subButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            subButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeDraftFilter = btn.getAttribute('data-draft-status');
            renderDraftsList();
        });
    });
}

// Core Data Fetch
async function refreshAllData() {
    try {
        await Promise.all([
            fetchThreads(),
            fetchDrafts()
        ]);
        
        updateDashboardMetrics();
        renderDashboardStaleThreads();
        renderDashboardRecentDrafts();
        
        // Render panels based on active states
        if (state.activeTab === 'threads') renderThreadsTable();
        if (state.activeTab === 'drafts') renderDraftsList();
        
    } catch (error) {
        console.error("Data refresh failed:", error);
        showToast("Failed to sync workspace data.", "danger");
    }
}

async function fetchThreads() {
    // Limits default to 200 to load all for the user
    const response = await fetch(`${API_BASE}/threads/?user_id=${encodeURIComponent(state.userId)}&limit=200`);
    if (!response.ok) throw new Error("Could not fetch threads.");
    const data = await response.json();
    state.threads = data.threads || [];
}

async function fetchDrafts() {
    const response = await fetch(`${API_BASE}/drafts/?user_id=${encodeURIComponent(state.userId)}&limit=200`);
    if (!response.ok) throw new Error("Could not fetch drafts.");
    const data = await response.json();
    state.drafts = data.drafts || [];
}

// Format Date Utility
function formatCustomDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getRelativeTimeString(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        if (diffHrs === 0) return 'Just now';
        return `${diffHrs}h ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
}

// Calculate Metrics & Render Dashboard Metrics
function updateDashboardMetrics() {
    // 1. Tracked Threads
    const trackingCount = state.threads.filter(t => t.status === 'tracking').length;
    document.getElementById('metric-tracked-threads').textContent = trackingCount;
    
    // 2. Pending Follow-ups
    const pendingDrafts = state.drafts.filter(d => d.status === 'pending');
    const pendingCount = pendingDrafts.length;
    document.getElementById('metric-pending-drafts').textContent = pendingCount;
    
    // Update sidebar badge
    const badge = document.getElementById('pending-drafts-badge');
    if (badge) {
        if (pendingCount > 0) {
            badge.textContent = pendingCount;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }
    
    // 3. Stale threads: tracking, and age >= state.staleAfterDays days old
    const staleThreads = getStaleThreads();
    document.getElementById('metric-stale-threads').textContent = staleThreads.length;
    const staleBadge = document.getElementById('stale-threads-badge');
    if (staleBadge) {
        staleBadge.textContent = `${staleThreads.length} Stale`;
        if (staleThreads.length > 0) {
            staleBadge.className = 'badge badge-danger';
        } else {
            staleBadge.className = 'badge badge-dismissed';
        }
    }
    
    // 4. Total Tokens Used
    const totalTokens = state.drafts.reduce((sum, d) => sum + (d.tokens_used || 0), 0);
    document.getElementById('metric-tokens-used').textContent = totalTokens.toLocaleString();
}

// Compute stale threads list (tracking status and older than threshold)
function getStaleThreads() {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - state.staleAfterDays);
    
    return state.threads.filter(t => {
        if (t.status !== 'tracking') return false;
        const sentAt = new Date(t.sent_at);
        return sentAt < thresholdDate;
    }).sort((a, b) => b.urgency_score - a.urgency_score); // Sort by highest urgency score
}

// Render Dashboard: Stale Threads Table
function renderDashboardStaleThreads() {
    const tbody = document.getElementById('dashboard-stale-threads-body');
    if (!tbody) return;
    
    const staleThreads = getStaleThreads();
    
    if (staleThreads.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="table-empty">
                    No stale conversations detected. Keep up the good work!
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = staleThreads.map(t => {
        let intentBadge = '';
        if (t.intent_tag !== 'other') {
            intentBadge = `<span class="badge badge-warning" style="font-size: 10px; margin-top:4px;">${t.intent_tag.replace('_', ' ')}</span>`;
        }
        
        return `
            <tr>
                <td>
                    <div class="table-row-recipient">
                        <span class="recipient-name">${t.recipient_name}</span>
                        <span class="recipient-email">${t.recipient_email}</span>
                        ${intentBadge}
                    </div>
                </td>
                <td><span style="font-weight: 500;">${t.subject}</span></td>
                <td><span class="text-secondary">${getRelativeTimeString(t.sent_at)}</span></td>
                <td>
                    <span style="font-weight: 600; font-family:'Playfair Display', serif; color: ${t.urgency_score > 60 ? 'var(--status-stale-text)' : 'var(--text-secondary)'}">
                        ${t.urgency_score}%
                    </span>
                </td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="navigateToThreadsTab('${t.id}')">
                        Inspect
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Navigation Helper
window.navigateToThreadsTab = function(threadId) {
    const threadTabButton = document.querySelector('.sidebar-nav [data-tab="threads"]');
    if (threadTabButton) {
        threadTabButton.click();
        const searchInput = document.getElementById('threads-search-input');
        if (searchInput) {
            // Preset search to this specific thread
            const thread = state.threads.find(t => t.id === threadId);
            if (thread) {
                searchInput.value = thread.recipient_name;
                renderThreadsTable();
            }
        }
    }
};

// Render Dashboard: Recent Drafts list
function renderDashboardRecentDrafts() {
    const container = document.getElementById('dashboard-recent-drafts-list');
    if (!container) return;
    
    // Sort drafts by created_at desc, show top 4
    const pendingDrafts = state.drafts
        .filter(d => d.status === 'pending')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 4);
        
    if (pendingDrafts.length === 0) {
        container.innerHTML = `
            <p class="loading-text">No pending drafts to review.</p>
        `;
        return;
    }
    
    container.innerHTML = pendingDrafts.map(d => {
        // Find recipient name from thread relation if possible
        const thread = state.threads.find(t => t.id === d.thread_id);
        const recipient = thread ? thread.recipient_name : 'Unknown';
        
        return `
            <div class="draft-small-item" onclick="openDraftInWorkspace('${d.id}')">
                <div class="draft-small-header">
                    <span class="draft-small-name">${recipient}</span>
                    <span class="draft-small-date">${getRelativeTimeString(d.created_at)}</span>
                </div>
                <div class="draft-small-subject">${d.draft_subject}</div>
            </div>
        `;
    }).join('');
}

// Open Draft Shortcut
window.openDraftInWorkspace = function(draftId) {
    state.selectedDraftId = draftId;
    activeDraftFilter = 'pending';
    
    const draftTabButton = document.querySelector('.sidebar-nav [data-tab="drafts"]');
    if (draftTabButton) {
        draftTabButton.click();
    }
};

// Render Threads Panel Table
function renderThreadsTable() {
    const tbody = document.getElementById('threads-table-body');
    if (!tbody) return;
    
    const searchVal = document.getElementById('threads-search-input').value.toLowerCase().trim();
    
    let filtered = [...state.threads];
    
    // Apply tab filter
    if (activeThreadFilter !== 'all') {
        filtered = filtered.filter(t => t.status === activeThreadFilter);
    }
    
    // Apply search filter
    if (searchVal) {
        filtered = filtered.filter(t => 
            t.recipient_name.toLowerCase().includes(searchVal) ||
            t.recipient_email.toLowerCase().includes(searchVal) ||
            t.subject.toLowerCase().includes(searchVal)
        );
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="table-empty">No tracked conversations found.</td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filtered.map(t => {
        let statusBadge = '';
        switch(t.status) {
            case 'tracking':
                statusBadge = '<span class="badge badge-tracking">Tracking</span>';
                break;
            case 'draft_ready':
                statusBadge = '<span class="badge badge-ready">Draft Ready</span>';
                break;
            case 'replied':
                statusBadge = '<span class="badge badge-replied">Replied</span>';
                break;
            case 'dismissed':
                statusBadge = '<span class="badge badge-dismissed">Dismissed</span>';
                break;
        }
        
        let intentBadge = `<span class="badge badge-dismissed" style="font-size:10px;">${t.intent_tag.replace('_', ' ')}</span>`;
        if (t.intent_tag === 'job_application') {
            intentBadge = '<span class="badge badge-tracking" style="font-size:10px;">Job App</span>';
        } else if (t.intent_tag === 'sales') {
            intentBadge = '<span class="badge badge-warning" style="font-size:10px;">Sales</span>';
        } else if (t.intent_tag === 'networking') {
            intentBadge = '<span class="badge badge-ready" style="font-size:10px;">Network</span>';
        } else if (t.intent_tag === 'internship') {
            intentBadge = '<span class="badge badge-ready" style="font-size:10px; background-color:#E8F0FE; color:#1C3AA9">Intern</span>';
        }

        const urgencyLabel = `<span style="font-weight: 500; font-family:'Playfair Display', serif; color: ${t.urgency_score > 60 ? 'var(--status-stale-text)' : 'inherit'}">${t.urgency_score}%</span>`;

        let actionBtn = '';
        if (t.status === 'tracking') {
            actionBtn = `
                <button class="table-icon-btn text-danger" onclick="dismissThread('${t.id}')" title="Dismiss thread monitoring">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                </button>
            `;
        }

        return `
            <tr>
                <td>
                    <div class="table-row-recipient">
                        <span class="recipient-name">${t.recipient_name}</span>
                        <span class="recipient-email">${t.recipient_email}</span>
                    </div>
                </td>
                <td><span style="font-weight: 500;">${t.subject}</span></td>
                <td><span class="text-secondary">${formatCustomDate(t.sent_at)}</span></td>
                <td>${intentBadge}</td>
                <td>${urgencyLabel}</td>
                <td>${statusBadge}</td>
                <td class="table-row-actions">
                    <button class="table-icon-btn" onclick="inspectThreadDetails('${t.id}')" title="View email content">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    ${actionBtn}
                </td>
            </tr>
        `;
    }).join('');
}

// Dismiss Thread Operation
window.dismissThread = async function(threadId) {
    if (!confirm('Are you sure you want to stop monitoring this email thread?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/threads/${threadId}/dismiss`, {
            method: 'PATCH'
        });
        
        if (!response.ok) throw new Error("Could not dismiss thread.");
        
        showToast('Conversation dismissed and untracked.', 'success');
        refreshAllData();
    } catch (e) {
        console.error(e);
        showToast(e.message, 'danger');
    }
};

// Inspect Thread Details modal (reads the original body content)
window.inspectThreadDetails = function(threadId) {
    const thread = state.threads.find(t => t.id === threadId);
    if (!thread) return;
    
    // Create a temporary beautiful modal to show original thread body
    const modal = document.createElement('div');
    modal.className = 'drawer-overlay open';
    modal.style.zIndex = '200';
    modal.innerHTML = `
        <div class="drawer open" style="width: 500px; transform: translateX(0); left: calc(50% - 250px); top: 10%; height: 75vh; border-radius: var(--border-radius); border:1px solid var(--border-color); box-shadow: var(--shadow-premium)">
            <div class="drawer-header">
                <div>
                    <h3 class="drawer-title" style="font-family:'Playfair Display', serif">${thread.recipient_name}</h3>
                    <p class="drawer-subtitle">${thread.recipient_email}</p>
                </div>
                <button class="drawer-close-btn" onclick="this.closest('.drawer-overlay').remove()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="drawer-form" style="padding: 24px 32px; gap: 16px;">
                <div class="form-group">
                    <span class="form-label">Email Subject</span>
                    <span style="font-family:'Playfair Display', serif; font-size:16px; font-weight:600;">${thread.subject}</span>
                </div>
                <div class="form-group">
                    <span class="form-label">Sent Date</span>
                    <span class="text-secondary">${formatCustomDate(thread.sent_at)}</span>
                </div>
                <div class="form-group" style="flex-grow:1; overflow-y:auto; border-top:1px solid var(--border-color); padding-top:16px;">
                    <span class="form-label" style="margin-bottom:8px;">Original Message Body</span>
                    <p style="white-space:pre-wrap; font-size:13px; line-height:1.6; color:var(--text-secondary);">${thread.original_body}</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
};

// Render Drafts Box: Left List
function renderDraftsList() {
    const listContainer = document.getElementById('drafts-sidebar-list');
    if (!listContainer) return;
    
    const filteredDrafts = state.drafts
        .filter(d => d.status === activeDraftFilter)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
    if (filteredDrafts.length === 0) {
        listContainer.innerHTML = `
            <p class="loading-text" style="font-size:13px;">No ${activeDraftFilter} drafts.</p>
        `;
        // Clear editor pane if the active selection belonged to this filter
        if (state.selectedDraft && state.selectedDraft.status !== activeDraftFilter) {
            clearDraftEditor();
        }
        return;
    }
    
    listContainer.innerHTML = filteredDrafts.map(d => {
        const thread = state.threads.find(t => t.id === d.thread_id);
        const recipient = thread ? thread.recipient_name : 'Unknown Recipient';
        const activeClass = state.selectedDraftId === d.id ? 'active' : '';
        
        return `
            <div class="draft-card ${activeClass}" onclick="selectDraft('${d.id}')">
                <div class="draft-card-header">
                    <span class="draft-card-recipient">${recipient}</span>
                    <span class="draft-card-date">${getRelativeTimeString(d.created_at)}</span>
                </div>
                <div class="draft-card-subject">${d.draft_subject}</div>
                <div class="draft-card-footer">
                    <span class="draft-card-tone">${d.tone.toUpperCase()}</span>
                    <span style="font-size:10px; color:var(--text-tertiary)">${d.tokens_used} tokens</span>
                </div>
            </div>
        `;
    }).join('');
    
    // Auto-select first draft if none selected yet
    if (!state.selectedDraftId && filteredDrafts.length > 0) {
        selectDraft(filteredDrafts[0].id);
    } else if (state.selectedDraftId) {
        // Keep active draft card updated
        const activeCard = document.querySelector(`.draft-card.active`);
        if (!activeCard) {
            // If the selected draft is no longer in this list, reselect first item
            const item = filteredDrafts.find(d => d.id === state.selectedDraftId);
            if (!item) {
                selectDraft(filteredDrafts[0].id);
            }
        }
    }
}

// Select a Draft
async function selectDraft(draftId) {
    state.selectedDraftId = draftId;
    
    // Highlight list card
    document.querySelectorAll('.draft-card').forEach(card => {
        card.classList.remove('active');
    });
    
    // Add active class to clicked card
    const listCards = document.querySelectorAll('.draft-card');
    listCards.forEach(card => {
        if (card.getAttribute('onclick').includes(draftId)) {
            card.classList.add('active');
        }
    });

    const draft = state.drafts.find(d => d.id === draftId);
    if (!draft) return;
    
    state.selectedDraft = draft;
    
    // Fetch original thread body
    try {
        const threadResponse = await fetch(`${API_BASE}/threads/${draft.thread_id}`);
        if (threadResponse.ok) {
            state.selectedDraftThread = await threadResponse.json();
        } else {
            state.selectedDraftThread = null;
        }
    } catch(e) {
        console.error(e);
        state.selectedDraftThread = null;
    }
    
    renderDraftEditor();
}

function clearDraftEditor() {
    state.selectedDraftId = null;
    state.selectedDraft = null;
    state.selectedDraftThread = null;
    const editor = document.getElementById('draft-editor-container');
    if (editor) {
        editor.innerHTML = `
            <div class="draft-editor-placeholder">
                <svg class="placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                <h3>No Draft Selected</h3>
                <p>Select a follow-up draft from the left panel to review and take action.</p>
            </div>
        `;
    }
}

// Render the Draft Editor Pane
function renderDraftEditor() {
    const container = document.getElementById('draft-editor-container');
    if (!container || !state.selectedDraft) return;
    
    const draft = state.selectedDraft;
    const thread = state.selectedDraftThread;
    
    const recipientName = thread ? thread.recipient_name : 'Unknown Recipient';
    const recipientEmail = thread ? thread.recipient_email : 'unknown@domain.com';
    const originalBody = thread ? thread.original_body : 'No thread data available.';
    const originalSubject = thread ? thread.subject : 'No subject';
    
    let statusLabel = '';
    switch(draft.status) {
        case 'pending':
            statusLabel = '<span class="badge badge-warning draft-editor-meta-badge">Pending Review</span>';
            break;
        case 'approved':
            statusLabel = '<span class="badge badge-ready draft-editor-meta-badge">Approved</span>';
            break;
        case 'dismissed':
            statusLabel = '<span class="badge badge-dismissed draft-editor-meta-badge">Dismissed</span>';
            break;
    }
    
    const readOnlyAttr = draft.status !== 'pending' ? 'readonly' : '';
    const disableActionsClass = draft.status !== 'pending' ? 'style="display:none;"' : '';
    
    container.innerHTML = `
        <div class="draft-editor-header">
            <div class="draft-editor-title-container">
                <h3 style="font-family:'Playfair Display', serif; font-size: 20px;">Review Follow-up Draft</h3>
                <div class="draft-recipient-details">
                    <span>To: <strong>${recipientName}</strong> (${recipientEmail})</span>
                    ${statusLabel}
                </div>
            </div>
            <span class="text-secondary" style="font-size:11px;">Created: ${formatCustomDate(draft.created_at)}</span>
        </div>
        
        <div class="draft-editor-body">
            <!-- Expandable Original Thread -->
            <div class="original-thread-box">
                <div class="thread-box-header" onclick="toggleOriginalThreadBox(this)">
                    <span>Original Outbound Message Details</span>
                    <svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                <div class="thread-box-content">
                    <p style="margin-bottom:8px;"><strong>Subject:</strong> ${originalSubject}</p>
                    <p style="font-family:'Inter', sans-serif;">${originalBody}</p>
                </div>
            </div>
            
            <!-- Draft Subject Input -->
            <div class="editor-field-group">
                <label class="form-label" for="editor-draft-subject">Follow-up Subject</label>
                <input type="text" class="editor-input-subject" id="editor-draft-subject" value="${draft.draft_subject}" ${readOnlyAttr}>
            </div>
            
            <!-- Draft Body Area -->
            <div class="editor-field-group" style="flex-grow:1;">
                <label class="form-label" for="editor-draft-body">Follow-up Message Body</label>
                <textarea class="editor-textarea-body" id="editor-draft-body" ${readOnlyAttr}>${draft.draft_body}</textarea>
            </div>
        </div>
        
        <div class="editor-toolbar">
            <div class="editor-tokens-meta">
                <span>Tokens Consumed: <strong>${draft.tokens_used}</strong></span>
                <span>Tone Style: <strong>${draft.tone.toUpperCase()}</strong></span>
            </div>
            
            <div class="editor-actions-group" ${disableActionsClass}>
                <!-- Regeneration Controls -->
                <div class="regeneration-controls">
                    <select id="editor-tone-select" title="Choose tone for AI regeneration">
                        <option value="professional" ${draft.tone === 'professional' ? 'selected' : ''}>Professional</option>
                        <option value="friendly" ${draft.tone === 'friendly' ? 'selected' : ''}>Friendly</option>
                        <option value="urgent" ${draft.tone === 'urgent' ? 'selected' : ''}>Urgent</option>
                        <option value="warm" ${draft.tone === 'warm' ? 'selected' : ''}>Warm</option>
                        <option value="direct" ${draft.tone === 'direct' ? 'selected' : ''}>Direct</option>
                        <option value="persuasive" ${draft.tone === 'persuasive' ? 'selected' : ''}>Persuasive</option>
                    </select>
                    <button class="btn btn-secondary btn-sm" id="btn-regenerate-draft" onclick="regenerateActiveDraft('${draft.id}')">
                        Regenerate
                    </button>
                </div>
                
                <button class="btn btn-secondary" onclick="dismissActiveDraft('${draft.id}')">
                    Dismiss
                </button>
                <button class="btn btn-primary" onclick="approveActiveDraft('${draft.id}')">
                    Approve Draft
                </button>
            </div>
        </div>
    `;
}

// Toggle accordion block for original thread
window.toggleOriginalThreadBox = function(header) {
    const content = header.nextElementSibling;
    const chevron = header.querySelector('.chevron-icon');
    
    header.classList.toggle('open');
    content.classList.toggle('open');
    chevron.classList.toggle('rotated');
};

// Approve Draft Action
window.approveActiveDraft = async function(draftId) {
    const btn = document.querySelector('.btn-primary');
    if (btn) {
        btn.classList.add('btn-loading');
        btn.innerHTML = '<span class="btn-spinner"></span> Approving...';
    }
    
    try {
        const response = await fetch(`${API_BASE}/drafts/${draftId}/approve`, {
            method: 'POST'
        });
        
        if (!response.ok) throw new Error("Failed to approve draft.");
        
        showToast("Draft approved successfully.", "success");
        await refreshAllData();
        
        // Keep selection or re-render
        if (state.selectedDraftId === draftId) {
            // Re-fetch active status draft
            const approvedDraft = state.drafts.find(d => d.id === draftId);
            state.selectedDraft = approvedDraft;
            renderDraftEditor();
        }
    } catch (e) {
        console.error(e);
        showToast(e.message, "danger");
    } finally {
        if (btn) {
            btn.classList.remove('btn-loading');
            btn.innerHTML = 'Approve Draft';
        }
    }
};

// Dismiss Draft Action
window.dismissActiveDraft = async function(draftId) {
    if (!confirm("Are you sure you want to dismiss this draft follow-up?")) return;
    
    try {
        const response = await fetch(`${API_BASE}/drafts/${draftId}/dismiss`, {
            method: 'POST'
        });
        
        if (!response.ok) throw new Error("Failed to dismiss draft.");
        
        showToast("Draft dismissed.", "success");
        await refreshAllData();
        
        // Select next or clear
        const pendingList = state.drafts.filter(d => d.status === activeDraftFilter);
        if (pendingList.length > 0) {
            selectDraft(pendingList[0].id);
        } else {
            clearDraftEditor();
        }
    } catch (e) {
        console.error(e);
        showToast(e.message, "danger");
    }
};

// Regenerate Draft Action
window.regenerateActiveDraft = async function(draftId) {
    const toneSelect = document.getElementById('editor-tone-select');
    const btn = document.getElementById('btn-regenerate-draft');
    
    if (!toneSelect || !btn) return;
    
    const selectedTone = toneSelect.value;
    
    btn.disabled = true;
    btn.innerHTML = '<span class="loading-pulse"></span> Crafting...';
    
    try {
        const response = await fetch(`${API_BASE}/drafts/${draftId}/regenerate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tone: selectedTone })
        });
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || "Failed to regenerate draft.");
        }
        
        const newDraft = await response.json();
        showToast(`Draft regenerated in "${selectedTone}" tone.`, "success");
        
        // Set new selection
        state.selectedDraftId = newDraft.id;
        
        await refreshAllData();
        
        // Ensure new draft is selected
        await selectDraft(newDraft.id);
        
    } catch (e) {
        console.error(e);
        showToast(e.message, "danger");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = 'Regenerate';
        }
    }
};
