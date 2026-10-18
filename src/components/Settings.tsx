import React, { useState } from 'react';
import { UserProfile, NumberingSettings, AppSettings } from '../types';
import { Save, Download, Upload, ShieldCheck, Check, Image as ImageIcon, Trash2, UploadCloud, QrCode } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface SettingsProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onRefresh: () => void;
}

const defaultProfile: UserProfile = {
  name: 'Suren Hembram',
  addressLine1: 'Kanimahuli',
  addressLine2: 'P.O. Bend , P.S. Chakulia',
  cityStateZip: 'Chakulia Jharkhand 832301',
  country: 'India',
  phone: '08987608678',
  email: 'surenhembram97@gmail.com',
  website: 'suren-site.vercel.app',
  udyamNumber: 'UDYAM-JH-06-0090498-01-0004921',
  showUdyamOnBill: true,
  bankName: 'State Bank of India',
  accountType: 'Current Account',
  accountNumber: '45661497562',
  ifscCode: 'SBIN0014355',
  accountHolder: 'Suren Hembram',
  upiId: '',
  showBankDetailsOnBill: true,
  showUpiOnBill: false,
  showQrOnBill: false,
  defaultHideQty: false,
  defaultNotes: 'Thank you for your business.',
  defaultTerms: 'Due on Receipt',
  signatureText: 'Authorized Signatory',
  logoUrl: '',
  customQrUrl: '',
};

const defaultNumbering: NumberingSettings = {
  billOfSupplyPrefix: 'BOS',
  invoicePrefix: 'INV',
  estimatePrefix: 'EST',
  receiptPrefix: 'REC',
  nextNumberBOS: 1,
  nextNumberINV: 1,
  nextNumberEST: 1,
  nextNumberREC: 1,
};

export const Settings: React.FC<SettingsProps> = ({ settings, onSaveSettings, onRefresh }) => {
  const [profile, setProfile] = useState<UserProfile>(() => ({
    ...defaultProfile,
    ...(settings?.profile || {}),
  }));
  const [numbering, setNumbering] = useState<NumberingSettings>(() => ({
    ...defaultNumbering,
    ...(settings?.numbering || {}),
  }));
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleProfileChange = (field: keyof UserProfile, value: any) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputEl = e.target;
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must be less than 2MB.');
      inputEl.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      handleProfileChange('logoUrl', dataUrl);
      inputEl.value = '';
    };
    reader.onerror = () => {
      alert('Could not read logo image. Please ensure the file is not locked by another app or an offloaded iCloud file.');
      inputEl.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    handleProfileChange('logoUrl', '');
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputEl = e.target;
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('QR code image size must be less than 2MB.');
      inputEl.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      handleProfileChange('customQrUrl', dataUrl);
      inputEl.value = '';
    };
    reader.onerror = () => {
      alert('Could not read QR code image. Please ensure the file is not locked by another app or an offloaded iCloud file.');
      inputEl.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveQr = () => {
    handleProfileChange('customQrUrl', '');
  };

  const handleNumberingChange = (field: keyof NumberingSettings, value: any) => {
    setNumbering((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveSettings({ profile, numbering });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadBackup = () => {
    window.location.href = '/api/backup';
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputEl = e.target;
    if (!file) return;

    if (!confirm('Restoring will replace current records. Are you sure?')) {
      inputEl.value = '';
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      if (res.ok) {
        alert('Database restored successfully!');
        onRefresh();
      } else {
        alert('Failed to restore database');
      }
    } catch (err: any) {
      if (err.name === 'NotReadableError') {
        alert('Error reading backup file: The file could not be read due to file permissions or a file lock. Please ensure the file is closed in other editors, or downloaded locally from iCloud Drive/OneDrive, and try again.');
      } else {
        alert(`Error restoring backup: ${err.message || 'Unknown error'}`);
      }
    } finally {
      inputEl.value = '';
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Profile & Setup</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your billing entity details, Udyam registration, and invoice numbering.
          </p>
        </div>

        {savedSuccess && (
          <Badge variant="success" className="gap-1.5 px-3 py-1 text-xs">
            <Check className="w-3.5 h-3.5" />
            Saved Successfully
          </Badge>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Logo & Branding Card */}
        <Card className="shadow-2xs border-slate-200">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              Business Logo & Branding
            </CardTitle>
            <CardDescription className="text-xs">
              Upload your company or brand logo. It will automatically appear on all bill previews and exported PDFs.
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center p-2 overflow-hidden shrink-0">
                {profile.logoUrl ? (
                  <img
                    src={profile.logoUrl}
                    alt="Business Logo"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-400">
                    <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <span className="text-[10px] font-medium">No Logo</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 flex-1 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer">
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{profile.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>

                  {profile.logoUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Supported formats: PNG, JPG, SVG, WebP (Max 2MB). If no logo is uploaded, your default stylish monogram ("H") is used.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Billing Entity Card */}
        <Card className="shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm">Billing Entity Information</CardTitle>
            <CardDescription className="text-xs">Your name and contact details as shown on your bills</CardDescription>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name / Trading Name *</label>
                <Input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => handleProfileChange('name', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                <Input
                  type="text"
                  value={profile.phone}
                  onChange={(e) => handleProfileChange('phone', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <Input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleProfileChange('email', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Website URL</label>
                <Input
                  type="text"
                  value={profile.website}
                  onChange={(e) => handleProfileChange('website', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 1</label>
                <Input
                  type="text"
                  value={profile.addressLine1}
                  onChange={(e) => handleProfileChange('addressLine1', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address Line 2</label>
                <Input
                  type="text"
                  value={profile.addressLine2}
                  onChange={(e) => handleProfileChange('addressLine2', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">City, State & Pincode</label>
                <Input
                  type="text"
                  value={profile.cityStateZip}
                  onChange={(e) => handleProfileChange('cityStateZip', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Country</label>
                <Input
                  type="text"
                  value={profile.country}
                  onChange={(e) => handleProfileChange('country', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Authorized Signature Title</label>
                <Input
                  type="text"
                  value={profile.signatureText || 'Authorized Signatory'}
                  onChange={(e) => handleProfileChange('signatureText', e.target.value)}
                  placeholder="e.g. Authorized Signatory"
                />
              </div>
            </div>

            {/* Udyam Registration & Non-GST Badge */}
            <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900">Udyam Registration & Non-GST Profile</h3>
              </div>
              <p className="text-[11px] text-slate-600">
                Configured for non-GST registered small businesses. GST, CGST, and SGST are completely disabled.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Udyam Registration Number</label>
                  <Input
                    type="text"
                    value={profile.udyamNumber}
                    onChange={(e) => handleProfileChange('udyamNumber', e.target.value)}
                    placeholder="e.g. UDYAM-JH-06-0090498-01-XXXXXXX"
                    className="font-mono bg-white"
                  />
                </div>

                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={profile.showUdyamOnBill}
                      onChange={(e) => handleProfileChange('showUdyamOnBill', e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Show Udyam Reg Number on Bills & Invoices</span>
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank & Payment Information */}
        <Card className="shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Bank & UPI Payment Settings</CardTitle>
              <CardDescription className="text-xs">Configure your bank and UPI accounts shown directly on bills</CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-50 border-emerald-200">
              Client Payment Box
            </Badge>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                <Input
                  type="text"
                  value={profile.bankName}
                  onChange={(e) => handleProfileChange('bankName', e.target.value)}
                  placeholder="e.g. State Bank of India"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Holder Name</label>
                <Input
                  type="text"
                  value={profile.accountHolder}
                  onChange={(e) => handleProfileChange('accountHolder', e.target.value)}
                  placeholder="e.g. Suren Hembram"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                <Input
                  type="text"
                  value={profile.accountNumber}
                  onChange={(e) => handleProfileChange('accountNumber', e.target.value)}
                  className="font-mono"
                  placeholder="e.g. 45661497562"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Account Type</label>
                <Input
                  type="text"
                  list="account-type-presets"
                  value={profile.accountType || 'Current Account'}
                  onChange={(e) => handleProfileChange('accountType', e.target.value)}
                  placeholder="e.g. Current Account"
                />
                <datalist id="account-type-presets">
                  <option value="Current Account" />
                  <option value="Savings Account" />
                  <option value="Cash Credit (CC) Account" />
                  <option value="Overdraft (OD) Account" />
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                <Input
                  type="text"
                  value={profile.ifscCode}
                  onChange={(e) => handleProfileChange('ifscCode', e.target.value)}
                  className="font-mono uppercase"
                  placeholder="e.g. SBIN0014355"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">UPI ID (VPA)</label>
                <Input
                  type="text"
                  value={profile.upiId}
                  onChange={(e) => handleProfileChange('upiId', e.target.value)}
                  className="font-mono"
                  placeholder="e.g. surenhembram@okaxis"
                />
              </div>

              {/* Custom QR Code Image Upload */}
              <div className="md:col-span-2 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      Custom Payment QR Code Image (Optional)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Upload your official PhonePe, Google Pay, or Paytm merchant QR code image. If empty, a QR code is auto-generated from your UPI ID.
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-blue-600 bg-blue-50 border-blue-200">
                    {profile.customQrUrl ? 'Custom Image Active' : 'Auto-Generated QR'}
                  </Badge>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <div className="w-16 h-16 rounded-lg border border-slate-200 bg-white p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {profile.customQrUrl ? (
                      <img src={profile.customQrUrl} alt="Custom QR" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <QrCode className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer">
                      <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                      <span>{profile.customQrUrl ? 'Change QR Image' : 'Upload QR Image'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        onChange={handleQrUpload}
                        className="hidden"
                      />
                    </label>

                    {profile.customQrUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveQr}
                        className="gap-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Use Auto-Generated Instead
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bill Display Toggles */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                Bill Display Options
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.showBankDetailsOnBill ?? true}
                    onChange={(e) => handleProfileChange('showBankDetailsOnBill', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Show Bank Details Card</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.showUpiOnBill ?? true}
                    onChange={(e) => handleProfileChange('showUpiOnBill', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Show UPI ID</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.showQrOnBill ?? true}
                    onChange={(e) => handleProfileChange('showQrOnBill', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Show Scan-to-Pay QR Code</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.defaultHideQty ?? false}
                    onChange={(e) => handleProfileChange('defaultHideQty', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>Service Business Mode (Hide Qty column by default)</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Numbering Sequences */}
        <Card className="shadow-2xs">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-sm">Auto-Numbering Sequences & Prefixes</CardTitle>
            <CardDescription className="text-xs">Customize numbering series for different bill types</CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bill of Supply Prefix</label>
                <Input
                  type="text"
                  value={numbering.billOfSupplyPrefix}
                  onChange={(e) => handleNumberingChange('billOfSupplyPrefix', e.target.value)}
                  className="font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Next Number (BOS)</label>
                <Input
                  type="number"
                  min="1"
                  value={numbering.nextNumberBOS}
                  onChange={(e) => handleNumberingChange('nextNumberBOS', parseInt(e.target.value, 10) || 1)}
                  className="font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Standard Invoice Prefix</label>
                <Input
                  type="text"
                  value={numbering.invoicePrefix}
                  onChange={(e) => handleNumberingChange('invoicePrefix', e.target.value)}
                  className="font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Next Number (INV)</label>
                <Input
                  type="number"
                  min="1"
                  value={numbering.nextNumberINV}
                  onChange={(e) => handleNumberingChange('nextNumberINV', parseInt(e.target.value, 10) || 1)}
                  className="font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            size="lg"
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </Button>
        </div>
      </form>

      {/* Data Safety & Backup */}
      <Card className="shadow-2xs border-slate-200">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-sm">Data Safety & Backup</CardTitle>
          <CardDescription className="text-xs">
            All your clients, invoices, and payment records are saved securely on your device. You can download a complete backup file to keep your data safe.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 flex flex-wrap items-center gap-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadBackup}
            className="gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            <Download className="w-4 h-4 text-blue-600" />
            Download Complete Backup
          </Button>

          <label className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-900 rounded-lg text-xs font-semibold shadow-2xs transition cursor-pointer">
            <Upload className="w-4 h-4 text-emerald-600" />
            <span>Restore Backup File</span>
            <input
              type="file"
              accept=".json"
              onChange={handleRestoreFile}
              className="hidden"
            />
          </label>
        </CardContent>
      </Card>
    </div>
  );
};
