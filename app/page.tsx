'use client'

import React, { useState, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { FiMail, FiRefreshCw, FiInbox, FiChevronRight, FiChevronDown, FiChevronUp, FiFilter, FiAlertCircle, FiClock, FiUser, FiSearch } from 'react-icons/fi'

// ─── Constants ───────────────────────────────────────────────────────────────

const AGENT_ID = '69a01a108b888baee3576cd5'

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmailSummary {
  sender?: string
  subject?: string
  date?: string
  summary_bullets?: string[]
  action_tag?: string
  urgency?: string
  full_summary?: string
  snippet?: string
}

interface AgentData {
  emails?: EmailSummary[]
  total_count?: number
  message?: string
  result?: AgentData
}

// ─── Sample Data ─────────────────────────────────────────────────────────────

const SAMPLE_EMAILS: EmailSummary[] = [
  {
    sender: 'Sarah Chen <sarah.chen@techcorp.io>',
    subject: 'Q4 Budget Review - Action Required by Friday',
    date: '2025-01-15T09:32:00Z',
    summary_bullets: [
      'Q4 budget exceeded projections by 12% due to infrastructure costs',
      'Requesting approval for revised Q1 allocation of $2.4M',
      'Meeting scheduled for Thursday at 2 PM to discuss line items',
      'Needs your sign-off before end of week'
    ],
    action_tag: 'Approval Required',
    urgency: 'high',
    full_summary: 'Sarah is requesting budget approval for Q1 after Q4 overruns. The infrastructure team spent more than expected on cloud migration, pushing costs 12% over budget. She has prepared a revised allocation of $2.4M and needs sign-off before the Friday board meeting.',
    snippet: 'Hi, I wanted to flag the Q4 budget situation before our Thursday meeting...'
  },
  {
    sender: 'James Morrison <j.morrison@clientco.com>',
    subject: 'Re: Project Milestone Update - Phase 2 Complete',
    date: '2025-01-15T08:15:00Z',
    summary_bullets: [
      'Phase 2 deliverables completed ahead of schedule',
      'Client satisfaction score at 4.8/5.0',
      'Phase 3 kickoff proposed for February 1st',
      'Requesting confirmation on new timeline'
    ],
    action_tag: 'Reply Needed',
    urgency: 'medium',
    full_summary: 'James confirms Phase 2 is done early with strong satisfaction scores. He proposes starting Phase 3 on February 1st and wants your confirmation on the adjusted timeline. The team is ready to proceed with the updated scope document attached.',
    snippet: 'Great news - the team wrapped up Phase 2 deliverables yesterday...'
  },
  {
    sender: 'HR Department <hr-notifications@company.com>',
    subject: 'Updated PTO Policy - Effective February 2025',
    date: '2025-01-14T16:45:00Z',
    summary_bullets: [
      'New PTO policy increases annual days from 20 to 25',
      'Rollover limit changed to 10 days maximum',
      'New mental health day category added (3 days/year)',
      'Policy effective February 1, 2025'
    ],
    action_tag: 'FYI',
    urgency: 'low',
    full_summary: 'The HR department has announced updated PTO policies effective February 2025. Key changes include 5 additional annual PTO days, a new mental health day category, and updated rollover limits. No action required - the changes will be reflected in the HR portal automatically.',
    snippet: 'Dear team, we are pleased to announce updates to our PTO policy...'
  },
  {
    sender: 'DevOps Bot <alerts@monitoring.internal>',
    subject: 'ALERT: Production API Latency Spike Detected',
    date: '2025-01-15T10:02:00Z',
    summary_bullets: [
      'API response times spiked to 2.3s (normal: 200ms)',
      'Affected endpoints: /api/users, /api/orders',
      'Root cause: database connection pool exhaustion',
      'Auto-scaling triggered, monitoring recovery'
    ],
    action_tag: 'Review',
    urgency: 'high',
    full_summary: 'Production monitoring detected a significant latency spike affecting core API endpoints. The database connection pool was exhausted during peak traffic. Auto-scaling has been triggered and the team is monitoring recovery. No manual intervention required unless latency persists beyond 30 minutes.',
    snippet: '[ALERT] Production API latency exceeded threshold at 10:02 UTC...'
  },
  {
    sender: 'Lisa Park <lisa.park@vendor.io>',
    subject: 'Contract Renewal Discussion - Follow Up',
    date: '2025-01-14T11:20:00Z',
    summary_bullets: [
      'Vendor proposing 3-year renewal with 8% discount',
      'Current contract expires March 31, 2025',
      'New SLA terms include 99.95% uptime guarantee',
      'Requesting meeting next week to finalize terms'
    ],
    action_tag: 'Follow Up',
    urgency: 'medium',
    full_summary: 'Lisa from our SaaS vendor is following up on the contract renewal discussion. They are offering an 8% discount for a 3-year commitment with improved SLA terms. The current contract expires at the end of March, so a decision is needed in the coming weeks.',
    snippet: 'Following up on our call last week regarding the contract renewal...'
  }
]

// ─── Helper Functions ────────────────────────────────────────────────────────

function getActionTagStyle(tag: string): string {
  const normalized = (tag ?? '').toLowerCase()
  if (normalized.includes('reply')) return 'bg-red-100 text-red-700 border border-red-200'
  if (normalized.includes('fyi')) return 'bg-teal-100 text-teal-700 border border-teal-200'
  if (normalized.includes('review')) return 'bg-amber-100 text-amber-700 border border-amber-200'
  if (normalized.includes('approval')) return 'bg-red-100 text-red-800 border border-red-300'
  if (normalized.includes('follow')) return 'bg-orange-100 text-orange-700 border border-orange-200'
  if (normalized.includes('no action')) return 'bg-gray-100 text-gray-600 border border-gray-200'
  return 'bg-gray-100 text-gray-600 border border-gray-200'
}

function getUrgencyStyle(urgency: string): { dot: string; label: string; text: string } {
  const normalized = (urgency ?? '').toLowerCase()
  if (normalized === 'high') return { dot: 'bg-red-500', label: 'High', text: 'text-red-600' }
  if (normalized === 'medium') return { dot: 'bg-amber-500', label: 'Medium', text: 'text-amber-600' }
  return { dot: 'bg-green-500', label: 'Low', text: 'text-green-600' }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return dateStr
  }
}

// ─── Markdown Renderer ───────────────────────────────────────────────────────

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

// ─── Error Boundary ──────────────────────────────────────────────────────────

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-card rounded-lg shadow-md p-5 border border-border animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="h-4 w-40 bg-muted rounded" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
        </div>
        <div className="h-5 w-20 bg-muted rounded-full" />
      </div>
      <div className="h-5 w-3/4 bg-muted rounded mb-3" />
      <div className="space-y-2">
        <div className="h-3 w-full bg-muted rounded" />
        <div className="h-3 w-5/6 bg-muted rounded" />
        <div className="h-3 w-4/6 bg-muted rounded" />
      </div>
    </div>
  )
}

// ─── Email Card ──────────────────────────────────────────────────────────────

function EmailCard({
  email,
  isExpanded,
  onToggle
}: {
  email: EmailSummary
  isExpanded: boolean
  onToggle: () => void
}) {
  const sender = email?.sender ?? 'Unknown Sender'
  const subject = email?.subject ?? 'No Subject'
  const date = email?.date ?? ''
  const bullets = Array.isArray(email?.summary_bullets) ? email.summary_bullets : []
  const actionTag = email?.action_tag ?? 'No Action'
  const urgency = email?.urgency ?? 'low'
  const fullSummary = email?.full_summary ?? ''
  const snippet = email?.snippet ?? ''

  const urgencyStyle = getUrgencyStyle(urgency)

  // Extract name from "Name <email>" pattern
  const senderName = sender.includes('<') ? sender.split('<')[0].trim() : sender
  const senderEmail = sender.includes('<') ? sender.match(/<(.+?)>/)?.[1] ?? '' : ''

  return (
    <div
      className="bg-card rounded-lg shadow-md border border-border transition-all duration-300 hover:shadow-lg cursor-pointer overflow-hidden"
      onClick={onToggle}
    >
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FiUser className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{senderName}</p>
              {senderEmail && (
                <p className="text-xs text-muted-foreground truncate">{senderEmail}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Urgency indicator */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${urgencyStyle.dot}`} />
              <span className={`text-xs font-medium ${urgencyStyle.text}`}>{urgencyStyle.label}</span>
            </div>
            {/* Action tag */}
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${getActionTagStyle(actionTag)}`}>
              {actionTag}
            </span>
          </div>
        </div>

        {/* Subject */}
        <h3 className="font-semibold text-foreground mb-2 leading-snug line-clamp-2">{subject}</h3>

        {/* Date */}
        {date && (
          <div className="flex items-center gap-1.5 mb-3">
            <FiClock className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{formatDate(date)}</span>
          </div>
        )}

        {/* Bullet Points */}
        {bullets.length > 0 && (
          <ul className="space-y-1.5">
            {bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-foreground/80">
                <FiChevronRight className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <span className="leading-relaxed">{bullet}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Expand/Collapse indicator */}
        <div className="flex items-center justify-center mt-3 pt-3 border-t border-border/50">
          {isExpanded ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FiChevronUp className="w-4 h-4" />
              <span>Show less</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <FiChevronDown className="w-4 h-4" />
              <span>Show more</span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-border/50 bg-secondary/30">
          {fullSummary && (
            <div className="mt-4">
              <h4 className="font-semibold text-sm text-foreground mb-2">Full Summary</h4>
              <div className="text-sm text-foreground/80 leading-relaxed">
                {renderMarkdown(fullSummary)}
              </div>
            </div>
          )}
          {snippet && (
            <div className="mt-4">
              <h4 className="font-semibold text-sm text-foreground mb-2">Email Preview</h4>
              <div className="bg-background/60 rounded-md p-3 border border-border/50">
                <p className="text-sm text-muted-foreground italic leading-relaxed">
                  &ldquo;{snippet}&rdquo;
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Agent Info Section ──────────────────────────────────────────────────────

function AgentInfoPanel({ isActive }: { isActive: boolean }) {
  return (
    <div className="bg-card rounded-lg shadow-md border border-border p-4">
      <h3 className="font-serif font-semibold text-sm text-foreground mb-3">Powered By</h3>
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <FiMail className="w-4 h-4 text-primary" />
          </div>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${isActive ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Email Summary Agent</p>
          <p className="text-xs text-muted-foreground">Fetches and summarizes Gmail emails with action tagging</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page Component ─────────────────────────────────────────────────────

export default function Page() {
  const [emails, setEmails] = useState<EmailSummary[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [agentMessage, setAgentMessage] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedCard, setExpandedCard] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState<boolean>(false)
  const [query, setQuery] = useState<string>('')
  const [maxResults, setMaxResults] = useState<number>(10)
  const [hasFetched, setHasFetched] = useState<boolean>(false)
  const [showSampleData, setShowSampleData] = useState<boolean>(false)

  const displayEmails = showSampleData ? SAMPLE_EMAILS : emails
  const displayTotal = showSampleData ? SAMPLE_EMAILS.length : totalCount
  const displayMessage = showSampleData ? 'Showing 5 sample email summaries for demonstration purposes.' : agentMessage

  // Recursively search for an emails array anywhere in a nested object/string
  const findEmailsDeep = useCallback((obj: any, depth: number = 0): EmailSummary[] | null => {
    if (depth > 8 || !obj) return null

    // If obj is a string, try to parse JSON out of it
    if (typeof obj === 'string') {
      const trimmed = obj.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          return findEmailsDeep(JSON.parse(trimmed), depth + 1)
        } catch { /* ignore */ }
      }
      // Try to find JSON within markdown code blocks
      const jsonMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
      if (jsonMatch) {
        try {
          return findEmailsDeep(JSON.parse(jsonMatch[1]), depth + 1)
        } catch { /* ignore */ }
      }
      return null
    }

    if (typeof obj !== 'object') return null

    // If it's an array, check if it looks like emails
    if (Array.isArray(obj)) {
      if (obj.length > 0 && obj[0] && typeof obj[0] === 'object' &&
          ('sender' in obj[0] || 'subject' in obj[0] || 'summary_bullets' in obj[0])) {
        return obj
      }
      return null
    }

    // Direct emails field
    if (Array.isArray(obj.emails) && obj.emails.length > 0) return obj.emails

    // Search common nesting keys
    const searchKeys = ['result', 'response', 'data', 'output', 'content', 'text', 'message', 'raw_response']
    for (const key of searchKeys) {
      if (obj[key] != null) {
        const found = findEmailsDeep(obj[key], depth + 1)
        if (found) return found
      }
    }

    return null
  }, [])

  // Extract full agent data with all fallback strategies
  const extractAgentData = useCallback((result: any): AgentData => {
    const empty: AgentData = { emails: [], total_count: 0, message: '' }

    // Strategy 1: Standard path — result.response.result.emails
    let agentData: any = result?.response?.result
    if (typeof agentData === 'string') {
      try { agentData = JSON.parse(agentData) } catch { /* ignore */ }
    }
    if (agentData && typeof agentData === 'object' && Array.isArray(agentData.emails) && agentData.emails.length > 0) {
      return { emails: agentData.emails, total_count: agentData.total_count ?? agentData.emails.length, message: agentData.message ?? '' }
    }

    // Strategy 2: Nested result — result.response.result.result.emails
    if (agentData?.result && typeof agentData.result === 'object') {
      const nested = typeof agentData.result === 'string' ? (() => { try { return JSON.parse(agentData.result) } catch { return null } })() : agentData.result
      if (nested && Array.isArray(nested.emails) && nested.emails.length > 0) {
        return { emails: nested.emails, total_count: nested.total_count ?? nested.emails.length, message: nested.message ?? '' }
      }
    }

    // Strategy 3: Parse raw_response — bypasses normalizeResponse wrapping issues
    // The raw_response contains the original agent output before normalization
    const rawResponse = result?.raw_response
    if (rawResponse && typeof rawResponse === 'string') {
      try {
        const rawParsed = JSON.parse(rawResponse)
        const emails = findEmailsDeep(rawParsed)
        if (emails && emails.length > 0) {
          // Find the parent object to get total_count and message
          const findParent = (o: any, d: number = 0): any => {
            if (d > 6 || !o || typeof o !== 'object' || Array.isArray(o)) return null
            if (Array.isArray(o.emails)) return o
            for (const k of ['result', 'response', 'data', 'output', 'content']) {
              if (o[k] && typeof o[k] === 'object') {
                const found = findParent(o[k], d + 1)
                if (found) return found
              }
              if (typeof o[k] === 'string') {
                try {
                  const p = JSON.parse(o[k])
                  const found = findParent(p, d + 1)
                  if (found) return found
                } catch { /* ignore */ }
              }
            }
            return null
          }
          const parent = findParent(rawParsed)
          return {
            emails,
            total_count: parent?.total_count ?? emails.length,
            message: parent?.message ?? ''
          }
        }
      } catch { /* ignore */ }
    }

    // Strategy 4: Deep search the entire result object
    const foundEmails = findEmailsDeep(result)
    if (foundEmails && foundEmails.length > 0) {
      return { emails: foundEmails, total_count: foundEmails.length, message: '' }
    }

    // Strategy 5: Check if agentData.text has embedded JSON with emails
    if (typeof agentData?.text === 'string') {
      const textEmails = findEmailsDeep(agentData.text)
      if (textEmails && textEmails.length > 0) {
        return { emails: textEmails, total_count: textEmails.length, message: '' }
      }
    }

    // No emails found — return whatever message we can extract
    const msg = agentData?.text || agentData?.message || result?.response?.message || ''
    return { ...empty, message: typeof msg === 'string' ? msg : '' }
  }, [findEmailsDeep])

  const fetchEmails = useCallback(async () => {
    setLoading(true)
    setError(null)
    setEmails([])
    setAgentMessage('')
    setTotalCount(0)
    setExpandedCard(null)
    setHasFetched(true)

    try {
      let message = `Please fetch and summarize my latest ${maxResults} emails.`
      if (query.trim()) {
        message = `Please fetch and summarize my latest ${maxResults} emails. Filter: ${query.trim()}`
      }

      const result = await callAIAgent(message, AGENT_ID)

      if (result.success) {
        const finalData = extractAgentData(result)

        const parsedEmails = Array.isArray(finalData?.emails) ? finalData.emails : []
        const parsedCount = typeof finalData?.total_count === 'number' ? finalData.total_count : parsedEmails.length
        const parsedMessage = finalData?.message ?? ''

        setEmails(parsedEmails)
        setTotalCount(parsedCount)
        setAgentMessage(typeof parsedMessage === 'string' ? parsedMessage : '')

        // If still no emails, provide a helpful message
        if (parsedEmails.length === 0 && !parsedMessage) {
          setAgentMessage('The agent responded but no email summaries were found. Try again or adjust your filters.')
        }
      } else {
        // Extract the most useful error message
        const rawError = result?.error ?? result?.response?.message ?? ''
        const rawStr = typeof result?.raw_response === 'string' ? result.raw_response : ''
        const fullError = rawError + ' ' + rawStr

        // Check for tool authentication issues
        if (fullError.includes('tool_auth') || fullError.includes('authentication') || fullError.includes('OAuth') || fullError.includes('credentials') || fullError.includes('not authenticated') || fullError.includes('401')) {
          setError('Gmail authentication is required. Please connect your Gmail account through the platform settings to allow the agent to access your emails.')
        } else if (fullError.includes('LYZR_API_KEY not configured')) {
          setError('Server configuration error: API key is not set. Please contact the administrator.')
        } else if (fullError.includes('timed out') || fullError.includes('timeout')) {
          setError('The request timed out. The agent may be processing a large number of emails. Please try again with fewer emails.')
        } else if (fullError.includes('Agent task failed') || fullError.includes('task failed')) {
          setError('The email agent encountered an error while processing. This may be a temporary issue. Please try again.')
        } else if (rawError) {
          setError(rawError)
        } else {
          setError('Failed to fetch emails. Please try again.')
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }, [query, maxResults, extractAgentData])

  const toggleCard = (index: number) => {
    setExpandedCard(prev => (prev === index ? null : index))
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <FiMail className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-serif text-xl font-bold text-foreground leading-tight">InboxIQ</h1>
                <p className="text-xs text-muted-foreground leading-none">Smart Email Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Sample Data Toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Sample Data</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showSampleData}
                  onClick={() => setShowSampleData(prev => !prev)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 ${showSampleData ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${showSampleData ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                </button>
              </label>
              {/* Summarize Button */}
              <button
                onClick={fetchEmails}
                disabled={loading}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{loading ? 'Summarizing...' : 'Summarize Inbox'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-4">
          <button
            onClick={() => setShowFilters(prev => !prev)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <FiFilter className="w-4 h-4" />
            <span>{showFilters ? 'Hide Filters' : 'Show Filters'}</span>
            {showFilters ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showFilters && (
            <div className="mt-3 bg-card rounded-lg shadow-md border border-border p-4 flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Search Filter</label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter by sender, subject, or keyword..."
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                  />
                </div>
              </div>
              <div className="w-full sm:w-28">
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Max Results</label>
                <input
                  type="number"
                  value={maxResults}
                  min={1}
                  max={50}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val) && val >= 1 && val <= 50) setMaxResults(val)
                  }}
                  className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-all"
                />
              </div>
              <button
                onClick={fetchEmails}
                disabled={loading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-60"
              >
                <FiSearch className="w-4 h-4" />
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          {/* Status Message */}
          {displayMessage && !loading && (displayEmails.length > 0 || showSampleData) && (
            <div className="bg-card rounded-lg border border-border p-3 flex items-center gap-3">
              <FiInbox className="w-5 h-5 text-primary flex-shrink-0" />
              <div>
                <span className="text-sm text-foreground">{displayMessage}</span>
                {displayTotal > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">({displayTotal} total)</span>
                )}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <FiRefreshCw className="w-4 h-4 text-primary animate-spin" />
                <span className="text-sm text-muted-foreground">Fetching and summarizing your emails...</span>
              </div>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-start gap-3">
              <FiAlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  {error.includes('Gmail authentication') ? 'Gmail Connection Required' : 'Failed to fetch emails'}
                </p>
                <p className="text-sm text-destructive/80 mt-1">{error}</p>
                {error.includes('Gmail authentication') && (
                  <p className="text-xs text-muted-foreground mt-2">
                    The Gmail integration needs OAuth authorization. Once connected, click Summarize Inbox again.
                  </p>
                )}
                <button
                  onClick={fetchEmails}
                  className="mt-3 flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  <FiRefreshCw className="w-3.5 h-3.5" />
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Empty State (no emails, not loading, no error) */}
          {!loading && !error && displayEmails.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="w-20 h-20 rounded-full bg-muted/60 flex items-center justify-center mb-5">
                <FiInbox className="w-10 h-10 text-muted-foreground/60" />
              </div>
              <h2 className="font-serif text-lg font-semibold text-foreground mb-2">
                {hasFetched ? 'No emails found' : 'No emails to summarize'}
              </h2>
              <p className="text-sm text-muted-foreground text-center max-w-sm mb-6 leading-relaxed">
                {hasFetched
                  ? 'Try adjusting your filters or fetching more emails.'
                  : 'Click the "Summarize Inbox" button to fetch your latest emails and get AI-powered summaries with action items and urgency tags.'}
              </p>
              {!hasFetched && (
                <button
                  onClick={fetchEmails}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <FiRefreshCw className="w-4 h-4" />
                  Summarize Inbox
                </button>
              )}
            </div>
          )}

          {/* Email Cards */}
          {!loading && displayEmails.length > 0 && (
            <div className="space-y-3">
              {displayEmails.map((email, idx) => (
                <EmailCard
                  key={idx}
                  email={email}
                  isExpanded={expandedCard === idx}
                  onToggle={() => toggleCard(idx)}
                />
              ))}
            </div>
          )}

          {/* Agent Info */}
          <div className="mt-8 pt-4">
            <AgentInfoPanel isActive={loading} />
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
