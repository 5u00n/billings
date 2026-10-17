import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Plus,
  Landmark,
  Trash2,
  FileCheck,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import { SbiPpsCheque, SbiPpsStatus } from '../../types';

interface SbiPpsChequeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SbiPpsChequeModal: React.FC<SbiPpsChequeModalProps> = ({ isOpen, onClose }) => {
  const [cheques, setCheques] = useState<SbiPpsCheque[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [chequeNumber, setChequeNumber] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [amount, setAmount] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Status edit state
  const [selectedChequeId, setSelectedChequeId] = useState<string | null>(null);
  const [ppsRefInput, setPpsRefInput] = useState('');

  const fetchCheques = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tax/sbi/pps-cheques');
      if (res.ok) {
        const data = await res.json();
        setCheques(data);
      }
    } catch (e) {
      console.error('Error fetching PPS cheques:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCheques();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chequeNumber || !payeeName || !amount) {
      alert('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/tax/sbi/pps-cheques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cheque_number: chequeNumber,
          payee_name: payeeName,
          amount: parseFloat(amount),
          issue_date: issueDate,
          notes,
        }),
      });

      if (!res.ok) throw new Error('Failed to add cheque');
      
      // Reset form
      setChequeNumber('');
      setPayeeName('');
      setAmount('');
      setNotes('');
      setShowAddForm(false);
      fetchCheques();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: SbiPpsStatus, ref?: string) => {
    try {
      const res = await fetch(`/api/tax/sbi/pps-cheques/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pps_status: status,
          pps_reference: ref || null,
        }),
      });
      if (res.ok) {
        setSelectedChequeId(null);
        setPpsRefInput('');
        fetchCheques();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteCheque = async (id: string) => {
    if (!confirm('Are you sure you want to delete this cheque log?')) return;
    try {
      await fetch(`/api/tax/sbi/pps-cheques/${id}`, { method: 'DELETE' });
      fetchCheques();
    } catch (e) {
      console.error(e);
    }
  };

  const parsedAmount = parseFloat(amount) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                SBI Positive Pay System (PPS) Cheque Register
                <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  RBI Mandate
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                SBI Current A/C: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">45661497562</span> (Chakulia Branch SBIN0014355)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational Banner */}
        <div className="p-4 bg-amber-500/5 border-b border-amber-500/10 text-xs text-slate-700 dark:text-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-900 dark:text-amber-300">Important SBI PPS Rules:</span>
              <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-slate-600 dark:text-slate-400">
                <li>Cheques of <strong>₹50,000+</strong>: Positive Pay registration recommended to prevent fraud.</li>
                <li>Cheques of <strong>₹5,00,000+</strong>: <strong>MANDATORY</strong> — SBI CTS clearing rejects the cheque if not pre-registered!</li>
              </ul>
            </div>
          </div>
          <a
            href="https://retail.onlinesbi.sbi/retail/login.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-xl font-medium transition-colors shrink-0"
          >
            Open OnlineSBI PPS <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Top Bar with Add Button */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Logged Cheques ({cheques.length})
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {showAddForm ? 'Cancel Form' : 'Log New Cheque'}
            </button>
          </div>

          {/* Add Form Drawer */}
          {showAddForm && (
            <form
              onSubmit={handleAddCheque}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-fade-in"
            >
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Issue a New Cheque from SBI Current Account
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cheque Number (6 digits) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 000105"
                    value={chequeNumber}
                    onChange={(e) => setChequeNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Payee / Beneficiary Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Vendor / Person Name"
                    value={payeeName}
                    onChange={(e) => setPayeeName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cheque Amount (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="50000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Date of Issue *
                  </label>
                  <input
                    type="date"
                    required
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Amount Guidance Alerts */}
              {parsedAmount >= 500000 ? (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <strong>Mandatory SBI Positive Pay:</strong> Amount is ₹5,00,000 or above. You must submit PPS details via SBI YONO or NetBanking before the payee presents this cheque.
                </div>
              ) : parsedAmount >= 50000 ? (
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <strong>PPS Recommended:</strong> Cheque exceeds ₹50,000. Registering in SBI Positive Pay guarantees against counterfeit alteration.
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Purpose / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hardware purchase, contractor payment"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                >
                  {submitting ? 'Saving...' : 'Save Cheque Log'}
                </button>
              </div>
            </form>
          )}

          {/* Cheque List Table */}
          {loading ? (
            <div className="text-center py-12 text-sm text-slate-400">Loading SBI PPS Cheques...</div>
          ) : cheques.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-3">
              <Landmark className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                No Cheques Logged Yet
              </div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Whenever you issue a multi-city cheque from your SBI Chakulia account (especially above ₹50,000), log it here to track its Positive Pay registration status.
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
              >
                + Log First Cheque
              </button>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3">Cheque No</th>
                    <th className="p-3">Issue Date</th>
                    <th className="p-3">Payee Name</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">PPS Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {cheques.map((chq) => (
                    <tr
                      key={chq.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3 font-mono font-semibold text-slate-900 dark:text-white">
                        {chq.cheque_number}
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {chq.issue_date}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{chq.payee_name}</div>
                        {chq.notes && <div className="text-[10px] text-slate-400">{chq.notes}</div>}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold whitespace-nowrap">
                        ₹{chq.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        {chq.amount >= 500000 && (
                          <div className="text-[9px] text-red-500 font-bold">MANDATORY PPS</div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {chq.pps_status === 'CONFIRMED_IN_SBI_PPS' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Confirmed in PPS
                            {chq.pps_reference && ` (${chq.pps_reference})`}
                          </span>
                        ) : chq.pps_status === 'CLEARED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <FileCheck className="w-3 h-3" />
                            Cleared
                          </span>
                        ) : chq.pps_status === 'CANCELLED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-500 border border-slate-500/20">
                            Cancelled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            Pending PPS
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {chq.pps_status === 'PENDING_REGISTRATION' && (
                            <button
                              onClick={() => {
                                setSelectedChequeId(chq.id);
                                setPpsRefInput('');
                              }}
                              className="px-2 py-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-md transition-colors"
                            >
                              ✓ Mark Confirmed
                            </button>
                          )}
                          {chq.pps_status === 'CONFIRMED_IN_SBI_PPS' && (
                            <button
                              onClick={() => handleUpdateStatus(chq.id, 'CLEARED')}
                              className="px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-md transition-colors"
                            >
                              Mark Cleared
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteCheque(chq.id)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Quick Ref Modal / Input */}
                        {selectedChequeId === chq.id && (
                          <div className="mt-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="SBI PPS Ref No (Optional)"
                              value={ppsRefInput}
                              onChange={(e) => setPpsRefInput(e.target.value)}
                              className="px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 w-36"
                            />
                            <button
                              onClick={() =>
                                handleUpdateStatus(chq.id, 'CONFIRMED_IN_SBI_PPS', ppsRefInput)
                              }
                              className="px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setSelectedChequeId(null)}
                              className="text-[10px] text-slate-400 hover:text-slate-600"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* SMS / Quick Info for SBI PPS */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
            <h5 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              Quick SMS Method for SBI Positive Pay:
            </h5>
            <p className="text-slate-600 dark:text-slate-400 font-mono text-[11px] bg-slate-200/50 dark:bg-slate-900/60 p-2 rounded-lg">
              SMS to <strong>9223440000</strong>:
              <br />
              <code>CPPS &lt;Account No&gt; &lt;Cheque No&gt; &lt;Cheque Date DDMMYYYY&gt; &lt;Amount&gt; &lt;Beneficiary Name&gt;</code>
            </p>
            <p className="text-[11px] text-slate-500">
              * Must be sent from your registered mobile number linked to SBI Account 45661497562.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            SBI Positive Pay protects against signature mismatch & CTS image alteration
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl transition-colors shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
