import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown, ArrowLeft, ArrowRight, Bell, Check, CheckCircle2, ChevronDown,
  ChevronRight, CircleHelp, Clock3, FileCheck2, FileText, Filter, Leaf,
  MapPin, Menu, MessageSquareText, MoreHorizontal, Search, ShieldCheck,
  Sparkles, Sprout, X,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const STEPS = ["Document review", "Field verification", "Eligibility check", "Decision"];
const STATUS_LABELS = {
  document_review: "Document review",
  field_verification: "Field visit",
  eligibility_check: "Eligibility",
  decision: "Decision due",
  returned: "Returned",
  approved: "Approved",
  rejected: "Rejected",
};
const STAGE_INDEX = {
  document_review: 0,
  field_verification: 1,
  eligibility_check: 2,
  decision: 3,
};
const money = (amount) => `₹${Number(amount).toLocaleString("en-IN")}`;
const shortDate = (date) => new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
  day: "numeric", month: "short",
});
const initials = (name = "") => name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || "Something went wrong. Please try again.");
  }
  return response.status === 204 ? null : response.json();
}

function App() {
  const [applications, setApplications] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [activeFilter, setActiveFilter] = useState("All applications");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setError("");
      const data = await request("/api/applications");
      setApplications(data);
    } catch (issue) {
      setError(issue.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(""), 3800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const counts = useMemo(() => ({
    total: applications.length,
    pending: applications.filter((app) => !["approved", "rejected"].includes(app.status)).length,
    attention: applications.filter((app) => app.needs_attention && !["approved", "rejected"].includes(app.status)).length,
    approved: applications.filter((app) => app.status === "approved").length,
  }), [applications]);

  const visibleApplications = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return applications.filter((app) => {
      const matchesQuery = !normalized || [
        app.applicant_name, app.id, app.village, app.farmer_id,
      ].some((value) => value.toLowerCase().includes(normalized));
      const matchesFilter = activeFilter === "All applications"
        || (activeFilter === "Needs attention" && app.needs_attention && !["approved", "rejected"].includes(app.status))
        || (activeFilter === "In progress" && !["approved", "rejected", "returned"].includes(app.status))
        || (activeFilter === "Completed" && ["approved", "rejected"].includes(app.status))
        || (activeFilter === "Returned" && app.status === "returned");
      return matchesQuery && matchesFilter;
    }).sort((a, b) => Number(b.needs_attention) - Number(a.needs_attention) || a.days_waiting - b.days_waiting);
  }, [applications, query, activeFilter]);

  const selected = applications.find((app) => app.id === selectedId);

  async function mutate(path, method = "POST", body) {
    try {
      setError("");
      const updated = await request(path, { method, body: body ? JSON.stringify(body) : undefined });
      if (updated?.id) {
        setApplications((current) => current.map((app) => app.id === updated.id ? updated : app));
      } else {
        await refresh();
      }
      return updated;
    } catch (issue) {
      setError(issue.message);
      throw issue;
    }
  }

  function showMessage(message) {
    setNotice(message);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Sprout size={21} strokeWidth={2.2} /></div>
          <div><div className="brand-name">sevasetu<span>.</span></div><div className="brand-caption">FIELD WORKSPACE</div></div>
          <button className="icon-button sidebar-close" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)}><X size={19} /></button>
        </div>

        <div className="office-switcher">
          <div className="office-icon"><Leaf size={17} /></div>
          <div className="office-copy"><strong>Rural Development</strong><span>Block office · Nashik</span></div>
          <ChevronDown size={16} className="muted-icon" />
        </div>

        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className="nav-item nav-active"><FileCheck2 size={18} /><span>Applications</span><span className="nav-count">{counts.pending}</span></button>
          <button className="nav-item" onClick={() => setActiveFilter("Needs attention")}><Clock3 size={18} /><span>Needs attention</span><span className="nav-dot" /></button>
          <button className="nav-item" onClick={() => setActiveFilter("Completed")}><CheckCircle2 size={18} /><span>Completed</span></button>
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><CircleHelp size={17} /></div>
            <strong>Need a hand?</strong>
            <p>Get help with the scheme or your workspace.</p>
            <button onClick={() => showMessage("Your block office helpdesk is available Monday–Friday, 10 am–5 pm.")}>Visit help centre <ArrowRight size={14} /></button>
          </div>
          <div className="profile">
            <div className="avatar officer-avatar">AM</div>
            <div className="profile-info"><strong>Anita More</strong><span>Field officer</span></div>
            <MoreHorizontal size={19} className="muted-icon" />
          </div>
        </div>
      </aside>

      {mobileMenuOpen && <button className="mobile-backdrop" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)} />}
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><button className="mobile-menu-button icon-button" aria-label="Open menu" onClick={() => setMobileMenuOpen(true)}><Menu size={20} /></button><span>Workspace</span><ChevronRight size={15} /><strong>Applications</strong></div>
          <div className="topbar-right"><span className="today-label">Monday, 16 November</span><button className="icon-button notification-button" aria-label="Notifications" onClick={() => showMessage("You’re all caught up on notifications.")}><Bell size={18} /><i /></button><div className="avatar top-avatar">AM</div></div>
        </header>

        <section className="page-content">
          <div className="welcome-row">
            <div><div className="eyebrow"><span className="live-dot" /> YOUR BLOCK · NASHIK</div><h1>Good morning, Anita <span className="wave">✳</span></h1><p className="page-subtitle">A little progress goes a long way. Here’s where things stand today.</p></div>
            <button className="scheme-pill"><span className="scheme-leaf"><Leaf size={15} /></span> Farmer equipment grant <ChevronDown size={15} /></button>
          </div>

          <div className="stats-grid">
            <StatCard label="Open applications" value={counts.pending} detail="Across all review stages" icon={<FileText size={17} />} tone="green" />
            <StatCard label="Need your attention" value={counts.attention} detail="Prioritised by waiting time" icon={<Clock3 size={17} />} tone="amber" />
            <StatCard label="Decisions this month" value={counts.approved} detail="Applications approved" icon={<Check size={17} />} tone="blue" />
            <div className="target-card"><div className="target-head"><span>THIS WEEK</span><span className="target-spark"><Sparkles size={15} /></span></div><strong>{Math.min(counts.pending, 8)} <span>/ 8</span></strong><div className="target-progress"><i style={{ width: `${Math.min(counts.pending / 8 * 100, 100)}%` }} /></div><p>applications reviewed <span>Keep it steady</span></p></div>
          </div>

          <section className="queue-section">
            <div className="section-heading"><div><h2>Your application queue</h2><p>Work through the next steps, one application at a time.</p></div><button className="text-button" onClick={() => { setActiveFilter("All applications"); setQuery(""); }}>View all <ArrowRight size={15} /></button></div>
            <div className="queue-toolbar">
              <div className="filter-tabs" role="group" aria-label="Filter applications">
                {["All applications", "Needs attention", "In progress", "Completed", "Returned"].map((filter) => (
                  <button key={filter} onClick={() => setActiveFilter(filter)} className={`filter-tab ${activeFilter === filter ? "filter-active" : ""}`}>{filter}{filter === "Needs attention" && counts.attention > 0 && <span className="filter-badge">{counts.attention}</span>}</button>
                ))}
              </div>
              <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or ID" aria-label="Search applications" />{query && <button aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}</label>
            </div>

            {error && <div className="error-banner" role="alert"><CircleHelp size={17} /><span>{error}</span><button onClick={refresh}>Try again</button></div>}
            {loading ? <div className="loading-state"><span className="loader" /> Loading your applications…</div> : (
              <div className="application-list">
                {visibleApplications.map((app) => <ApplicationRow key={app.id} app={app} onOpen={() => setSelectedId(app.id)} />)}
                {visibleApplications.length === 0 && <div className="empty-state"><div><Filter size={20} /></div><strong>No applications found</strong><p>Try a different search or clear the current filter.</p><button className="text-button" onClick={() => { setActiveFilter("All applications"); setQuery(""); }}>Clear filters <ArrowRight size={14} /></button></div>}
              </div>
            )}
            <div className="list-footer"><span>Showing <strong>{visibleApplications.length}</strong> of <strong>{applications.length}</strong> applications</span><span className="sync-label"><span className="live-dot" /> Saved automatically</span></div>
          </section>
          <footer className="page-footer"><span>SevaSetu <span>·</span> Made for the people who make a difference.</span><span><ShieldCheck size={14} /> Your work is private and secure</span></footer>
        </section>
      </main>

      {selected && <ApplicationPanel key={selected.id} app={selected} onClose={() => setSelectedId(null)} onMutate={mutate} onMessage={showMessage} />}
      {notice && <div className="toast" role="status"><CheckCircle2 size={17} />{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><X size={15} /></button></div>}
    </div>
  );
}

function StatCard({ label, value, detail, icon, tone }) {
  return <div className="stat-card"><div className="stat-top"><span>{label}</span><span className={`stat-icon ${tone}`}>{icon}</span></div><strong>{value}</strong><p>{detail}</p></div>;
}

function ApplicationRow({ app, onOpen }) {
  const stage = STAGE_INDEX[app.current_stage] ?? 0;
  const finalStatus = ["approved", "rejected"].includes(app.status);
  return (
    <button className={`application-row ${app.needs_attention && !finalStatus ? "row-priority" : ""}`} onClick={onOpen}>
      <div className="row-person"><div className={`avatar farmer-avatar avatar-${app.avatar_color || "sage"}`}>{initials(app.applicant_name)}</div><div className="person-copy"><div className="person-name">{app.applicant_name}{app.needs_attention && !finalStatus && <span className="priority-dot" />}</div><div className="person-meta"><span>{app.id}</span><i />{app.village}</div></div></div>
      <div className="row-stage"><div className="stage-label">{STATUS_LABELS[app.status] || "In progress"}</div><div className="mini-stepper" aria-label={`${STEPS[stage]}: step ${stage + 1} of ${STEPS.length}`}>{STEPS.map((_, index) => <i key={index} className={`${index < stage ? "mini-complete" : ""} ${index === stage ? "mini-current" : ""}`} />)}</div><div className="stage-helper">{finalStatus ? (app.status === "approved" ? "Decision recorded" : "Closed") : `Step ${stage + 1} of ${STEPS.length}`}</div></div>
      <div className="row-amount"><span>Requested</span><strong>{money(app.requested_amount)}</strong></div>
      <div className="row-waiting"><span className={app.days_waiting >= 7 && !finalStatus ? "waiting-urgent" : ""}><Clock3 size={13} />{app.days_waiting}d</span><span>waiting</span></div>
      <div className="row-chevron"><ChevronRight size={18} /></div>
    </button>
  );
}

function ApplicationPanel({ app, onClose, onMutate, onMessage }) {
  const [assist, setAssist] = useState(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [returnNote, setReturnNote] = useState("");
  const [showReturn, setShowReturn] = useState(false);
  const [localError, setLocalError] = useState("");
  const stageIndex = STAGE_INDEX[app.current_stage] ?? 0;
  const isFinal = ["approved", "rejected"].includes(app.status);

  async function getAssistance() {
    setAssistLoading(true);
    setLocalError("");
    try {
      setAssist(await request(`/api/applications/${app.id}/assistance`));
    } catch (issue) {
      setLocalError(issue.message);
    } finally {
      setAssistLoading(false);
    }
  }

  async function perform(action, extra = {}) {
    setWorking(true);
    setLocalError("");
    try {
      await onMutate(`/api/applications/${app.id}/${action}`, "POST", extra);
      onMessage(action === "advance" ? "Application moved to the next review step." : action === "decide" ? "Your decision has been recorded." : action === "resubmit" ? "Application returned to the review queue." : "Application returned for more information.");
      if (action === "decide") onClose();
    } catch (issue) {
      setLocalError(issue.message);
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="panel-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="detail-panel" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <header className="panel-header"><div className="panel-breadcrumb"><button onClick={onClose}><ArrowLeft size={16} /> Applications</button><ChevronRight size={14} /><span>{app.id}</span></div><button className="icon-button panel-close" onClick={onClose} aria-label="Close application"><X size={19} /></button></header>
        <div className="panel-scroll">
          <div className="detail-eyebrow"><span className="scheme-leaf"><Leaf size={13} /></span> FARMER EQUIPMENT GRANT <span className="detail-dot">·</span> {app.id}</div>
          <div className="detail-title-row"><div><h2 id="detail-title">{app.applicant_name}</h2><p>{app.farmer_id} <span>·</span> Applied {shortDate(app.submitted_on)}</p></div><div className={`avatar farmer-avatar avatar-${app.avatar_color || "sage"} detail-avatar`}>{initials(app.applicant_name)}</div></div>
          <div className={`status-banner ${app.status === "approved" ? "status-approved" : app.status === "rejected" ? "status-rejected" : app.status === "returned" ? "status-returned" : ""}`}><span className="status-icon">{app.status === "approved" ? <CheckCircle2 size={16} /> : app.status === "returned" ? <ArrowLeft size={16} /> : <Clock3 size={16} />}</span><span><strong>{STATUS_LABELS[app.status] || "In review"}</strong><small>{isFinal ? "This application has been closed." : app.status === "returned" ? "Waiting for the applicant to provide more information." : `${app.days_waiting} days in the review queue`}</small></span><span className="status-stage">{isFinal ? "CLOSED" : app.status === "returned" ? "ON HOLD" : `${stageIndex + 1} / 4`}</span></div>

          <div className="stepper-section"><div className="panel-section-heading"><h3>Review progress</h3><span>{isFinal ? "Complete" : `Stage ${stageIndex + 1} of 4`}</span></div><div className="vertical-stepper">{STEPS.map((step, index) => { const done = index < stageIndex || isFinal; const current = index === stageIndex && !isFinal; return <div key={step} className={`vertical-step ${done ? "step-done" : ""} ${current ? "step-current" : ""}`}><span className="step-marker">{done ? <Check size={13} /> : index + 1}</span><div className="step-copy"><strong>{step}</strong><span>{done ? app.history.find((event) => event.to_stage === ["document_review", "field_verification", "eligibility_check", "decision"][index])?.date || "Completed" : current ? "Current step" : "Up next"}</span></div></div>; })}</div></div>

          {!isFinal && app.status !== "returned" && (
            <section className="assist-card"><div className="assist-heading"><div className="assist-icon"><Sparkles size={16} /></div><div><h3>A little help from AI</h3><p>Practical guidance for this review step</p></div><span className="assist-label">ADVISORY</span></div>
              {!assist ? <div className="assist-intro"><p>Get a quick checklist and a summary of things worth a closer look. You make every decision.</p><button className="assist-button" disabled={assistLoading} onClick={getAssistance}><Sparkles size={15} />{assistLoading ? "Preparing guidance…" : "Get review guidance"}<ArrowRight size={15} /></button></div> : <div className="assist-content"><div className="assist-summary">{assist.summary}</div><div className="assist-list-title">SUGGESTED CHECKS</div><ul>{assist.checks.map((check) => <li key={check}><span><Check size={12} /></span>{check}</li>)}</ul>{assist.flags.length > 0 && <div className="assist-flag"><CircleHelp size={15} /><span>{assist.flags.join(" ")}</span></div>}<div className="assist-disclaimer"><ShieldCheck size={13} /> {assist.disclaimer}</div><button className="assist-retry" onClick={getAssistance} disabled={assistLoading}>{assistLoading ? "Refreshing…" : "Refresh guidance"}</button></div>}
            </section>
          )}

          {app.status === "returned" && <div className="returned-notice"><MessageSquareText size={17} /><div><strong>Waiting on the applicant</strong><p>{app.return_reason || "The applicant needs to provide additional information before review can continue."}</p></div></div>}

          <section className="applicant-section"><div className="panel-section-heading"><h3>Applicant & request</h3><button className="quiet-button" onClick={() => onMessage("Application documents are securely stored with the original case file.")}><FileText size={14} /> View file</button></div><div className="info-card"><InfoRow icon={<MapPin size={16} />} label="Village" value={app.village} detail={`${app.distance_km} km from block office`} /><InfoRow icon={<Sprout size={16} />} label="Landholding" value={`${app.land_acres} acres`} detail={`Farmer ID · ${app.farmer_id}`} /><InfoRow icon={<FileText size={16} />} label="Equipment requested" value={app.equipment} detail={`${app.quantity} ${app.quantity === 1 ? "unit" : "units"}`} /><div className="amount-row"><span>Subsidy requested</span><strong>{money(app.requested_amount)}</strong></div></div></section>

          <section className="history-section"><div className="panel-section-heading"><h3>Application history</h3><span className="history-count">{app.history.length} updates</span></div><div className="history-list">{[...app.history].reverse().map((event) => <div className="history-item" key={event.id}><div className={`history-marker ${event.type === "decision" ? "history-decision" : ""}`}>{event.type === "decision" ? <Check size={12} /> : null}</div><div className="history-copy"><strong>{event.title}</strong><p>{event.description}</p><span>{event.actor} <i>·</i> {shortDate(event.date)}</span></div></div>)}</div></section>

          {localError && <div className="error-banner panel-error" role="alert"><CircleHelp size={16} />{localError}</div>}
          {app.status === "returned" ? <div className="panel-actions"><button className="primary-button full-button" disabled={working} onClick={() => perform("resubmit")}><Check size={16} /> Mark information received</button><p className="decision-note">Use this when the applicant has provided the requested information.</p></div> : isFinal ? <div className="final-note"><ShieldCheck size={16} /> Decision recorded by a field officer. No automated decisions are made.</div> : <div className="panel-actions">{showReturn ? <div className="return-form"><label htmlFor="return-note">What information is needed? <span>Required</span></label><textarea id="return-note" value={returnNote} onChange={(event) => setReturnNote(event.target.value)} placeholder="e.g. Please provide a current landholding record." rows={3} /><div><button className="secondary-button" onClick={() => setShowReturn(false)}>Cancel</button><button className="return-button" disabled={!returnNote.trim() || working} onClick={() => perform("return", { reason: returnNote.trim() })}>Send back to applicant</button></div></div> : stageIndex < STEPS.length - 1 ? <><button className="primary-button full-button" disabled={working} onClick={() => perform("advance")}><span>{working ? "Saving…" : `Complete ${STEPS[stageIndex].toLowerCase()}`}</span><ArrowRight size={16} /></button><button className="link-action" onClick={() => setShowReturn(true)}><ArrowLeft size={14} /> Return for more information</button><p className="decision-note">You review and decide at every step. AI suggestions are never a decision.</p></> : <><div className="decision-prompt">You’ve completed the review. The final decision is yours.</div><div className="decision-buttons"><button className="approve-button" disabled={working} onClick={() => perform("decide", { decision: "approved" })}><Check size={15} /> Approve</button><button className="reject-button" disabled={working} onClick={() => perform("decide", { decision: "rejected" })}>Reject</button></div><button className="link-action" onClick={() => setShowReturn(true)}><ArrowLeft size={14} /> Return for more information</button><p className="decision-note">Your decision and reason will be recorded in the application history.</p></>}</div>}
        </div>
      </aside>
    </div>
  );
}

function InfoRow({ icon, label, value, detail }) {
  return <div className="info-row"><span className="info-icon">{icon}</span><div className="info-copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

export default App;
