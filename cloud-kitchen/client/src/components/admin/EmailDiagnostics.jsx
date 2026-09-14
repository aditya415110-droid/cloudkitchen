import { useState } from 'react';
import { FiMail, FiSend, FiCheckCircle, FiXCircle, FiActivity, FiAlertTriangle } from 'react-icons/fi';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * Admin-only SMTP troubleshooting panel.
 *
 * Shows the resolved mail settings, whether the server can reach the SMTP host,
 * and the raw per-port error when it cannot, so a broken deployment can be
 * diagnosed without shell access to the server logs.
 */
export default function EmailDiagnostics() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState(user?.email || '');

  const checkConnection = async () => {
    setChecking(true);
    setStatus(null);
    setTestResult(null);
    try {
      const { data } = await api.getEmailStatus();
      setStatus(data);
    } catch (err) {
      setStatus({ ok: false, reason: 'request_failed', message: err.message });
    } finally {
      setChecking(false);
    }
  };

  const sendTest = async () => {
    const to = recipient.trim();
    if (!to) return;

    setSending(true);
    setTestResult(null);
    try {
      const { data } = await api.sendTestEmail(to);
      setTestResult(data);
    } catch (err) {
      setTestResult({ ok: false, error: err.message, hint: 'The request never reached the mail code.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="card p-6 space-y-5">
      <div>
        <h2 className="font-bold flex items-center gap-2">
          <FiMail size={16} className="text-brand-500" /> Email Diagnostics
        </h2>
        <p className="text-xs text-gray-500 mt-1">
          Checks whether this server can actually send mail. Useful after a deploy, when
          order emails go missing.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={checkConnection}
          disabled={checking}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <FiActivity size={15} /> {checking ? 'Checking...' : 'Check SMTP Connection'}
        </button>
      </div>

      {status && <StatusReport status={status} />}

      {/* Test send */}
      <div className="border-t pt-5">
        <label className="block text-sm font-medium mb-1">Send a test email to</label>
        <div className="flex flex-wrap gap-2">
          <input
            className="input flex-1 min-w-[220px]"
            type="email"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
            placeholder="you@example.com"
          />
          <button
            type="button"
            onClick={sendTest}
            disabled={sending || !recipient.trim()}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <FiSend size={15} /> {sending ? 'Sending...' : 'Send Test'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">This sends a real email. Check the inbox to confirm delivery.</p>
      </div>

      {testResult && <TestReport result={testResult} />}
    </section>
  );
}

function Banner({ ok, title, children }) {
  return (
    <div className={`rounded-lg p-4 border ${ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <p className={`font-semibold flex items-center gap-2 ${ok ? 'text-green-800' : 'text-red-800'}`}>
        {ok ? <FiCheckCircle size={16} /> : <FiXCircle size={16} />} {title}
      </p>
      {children}
    </div>
  );
}

function Hint({ children }) {
  if (!children) return null;
  return (
    <p className="flex gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
      <FiAlertTriangle size={15} className="flex-shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

/** Per-port attempt log, including the raw SMTP error for failures. */
function Attempts({ attempts }) {
  if (!attempts?.length) return null;
  return (
    <div className="mt-3">
      <p className="text-xs font-semibold text-gray-600 mb-1">Attempts</p>
      <div className="space-y-1">
        {attempts.map((a, i) => (
          <pre
            key={i}
            className={`text-xs whitespace-pre-wrap break-words rounded p-2 font-mono ${
              a.ok ? 'bg-green-100 text-green-900' : 'bg-gray-900 text-gray-100'
            }`}
          >
            port {a.port} ({a.secure ? 'TLS' : 'STARTTLS'}) · {a.ms}ms · {a.ok ? 'OK' : 'FAILED'}
            {a.error ? `\n${a.error}` : ''}
            {a.response ? `\n${a.response}` : ''}
          </pre>
        ))}
      </div>
    </div>
  );
}

function StatusReport({ status }) {
  const s = status.settings;

  return (
    <div>
      <Banner
        ok={status.ok}
        title={status.ok
          ? `SMTP reachable on port ${status.port}`
          : status.reason === 'not_configured' ? 'SMTP is not configured' : 'SMTP is unreachable'}
      >
        {!status.ok && status.message && (
          <pre className="text-xs whitespace-pre-wrap break-words bg-gray-900 text-gray-100 rounded p-2 mt-2 font-mono">
            {status.message}
          </pre>
        )}
      </Banner>

      {s && (
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm mt-4">
          <Field label="Host" value={s.host || 'not set'} missing={!s.host} />
          <Field label="Port" value={`${s.port}${s.secure ? ' (TLS)' : ' (STARTTLS)'}`} />
          <Field label="User" value={s.user || 'not set'} missing={!s.user} />
          <Field label="Password" value={s.passwordSet ? 'set' : 'not set'} missing={!s.passwordSet} />
          <Field label="From" value={s.from} missing={/^["']|["']$/.test(s.from || '')} />
          <Field
            label="Admin alerts to"
            value={s.adminEmails?.length ? s.adminEmails.join(', ') : 'ADMIN-role users (ADMIN_EMAILS unset)'}
          />
        </dl>
      )}

      {s && /^["']|["']$/.test(s.from || '') && (
        <Hint>
          The From address still has quotes around it. Remove them from the EMAIL_FROM
          environment variable, or the mail server will reject the header.
        </Hint>
      )}
    </div>
  );
}

function TestReport({ result }) {
  return (
    <div>
      <Banner
        ok={result.ok}
        title={result.ok
          ? `Test email sent to ${result.to}${result.usedFallback ? ` (via fallback port ${result.via?.port})` : ''}`
          : 'Test email failed'}
      >
        {result.ok
          ? <p className="text-sm text-green-800 mt-1">Check that inbox, and the spam folder.</p>
          : result.error && (
            <pre className="text-xs whitespace-pre-wrap break-words bg-gray-900 text-gray-100 rounded p-2 mt-2 font-mono">
              {result.error}
            </pre>
          )}
      </Banner>

      {!result.ok && <Hint>{result.hint}</Hint>}

      {result.ok && result.usedFallback && (
        <Hint>
          Port {result.via?.port} worked but your configured port did not. Set
          EMAIL_PORT={result.via?.port} and EMAIL_SECURE={String(result.via?.secure)} so
          every email skips the failing attempt.
        </Hint>
      )}

      <Attempts attempts={result.attempts} />
    </div>
  );
}

function Field({ label, value, missing }) {
  return (
    <div className="flex justify-between gap-3 border-b border-gray-100 py-1">
      <dt className="text-gray-500 flex-shrink-0">{label}</dt>
      <dd className={`font-mono text-xs text-right break-all ${missing ? 'text-red-600 font-semibold' : 'text-gray-800'}`}>
        {value}
      </dd>
    </div>
  );
}
