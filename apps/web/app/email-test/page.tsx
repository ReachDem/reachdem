'use client';

import { useState, useEffect } from 'react';

interface EmailRecord {
  id: string;
  to: string;
  subject: string;
  htmlBody?: string;
  textBody?: string;
  fromAlias: string;
  accountName: string;
  sentAt: string;
  status: 'sent' | 'failed' | 'pending';
  deliveryStatus?: 'delivered' | 'bounced' | 'complained' | 'pending';
  error?: string;
  updatedAt: string;
}

interface EmailStats {
  total: number;
  sent: number;
  failed: number;
  delivered: number;
  bounced: number;
  complained: number;
  pending: number;
}

export default function EmailTestPage() {
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    accountName: 'notifications@mail.rcdm.ink',
    fromAlias: 'ReachDem Notifications',
    toAddress: '',
    subject: 'Test Email',
    htmlBody: '<h1>Hello!</h1><p>This is a test email from Alibaba Cloud.</p>',
  });

  const [sendResult, setSendResult] = useState<any>(null);

  // Charger les emails
  const loadEmails = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/emails');
      const data = await response.json();
      setEmails(data.emails || []);
      setStats(data.stats || null);
    } catch (error) {
      console.error('Erreur lors du chargement des emails:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmails();
  }, []);

  // Envoyer un email
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendResult(null);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      setSendResult(data);

      if (data.success) {
        // Recharger la liste des emails
        loadEmails();
        // Réinitialiser certains champs
        setFormData(prev => ({
          ...prev,
          subject: 'Test Email',
        }));
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi:', error);
      setSendResult({ success: false, error: 'Erreur réseau' });
    } finally {
      setSending(false);
    }
  };

  // Mettre à jour le statut de délivrabilité
  const updateDeliveryStatus = async (emailId: string, status: string) => {
    try {
      await fetch(`/api/emails/${emailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryStatus: status }),
      });
      loadEmails();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900">
          Test Alibaba Cloud Direct Mail
        </h1>

        {/* Statistiques */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Envoyés</div>
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Échoués</div>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-sm text-gray-600">Livrés</div>
              <div className="text-2xl font-bold text-blue-600">{stats.delivered}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulaire d'envoi */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Envoyer un email</h2>
            
            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name (Email vérifié sur Alibaba Cloud) *
                </label>
                <input
                  type="email"
                  required
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  placeholder="noreply@votredomaine.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Alias (Nom d'affichage)
                </label>
                <input
                  type="text"
                  value={formData.fromAlias}
                  onChange={(e) => setFormData({ ...formData, fromAlias: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Address (Destinataire) *
                </label>
                <input
                  type="email"
                  required
                  value={formData.toAddress}
                  onChange={(e) => setFormData({ ...formData, toAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                  placeholder="destinataire@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  HTML Body *
                </label>
                <textarea
                  required
                  value={formData.htmlBody}
                  onChange={(e) => setFormData({ ...formData, htmlBody: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md h-32 text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {sending ? 'Envoi en cours...' : 'Envoyer l\'email'}
              </button>
            </form>

            {/* Résultat de l'envoi */}
            {sendResult && (
              <div className={`mt-4 p-4 rounded-md ${sendResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <h3 className="font-semibold mb-2 text-gray-900">
                  {sendResult.success ? '✓ Email envoyé avec succès!' : '✗ Échec de l\'envoi'}
                </h3>
                {sendResult.error && (
                  <p className="text-sm text-red-700">Erreur: {sendResult.error}</p>
                )}
                {sendResult.recommendation && (
                  <p className="text-sm text-gray-700 mt-2">
                    Recommandation: {sendResult.recommendation}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Liste des emails envoyés */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Historique des emails</h2>
              <button
                onClick={loadEmails}
                className="text-sm text-blue-600 hover:text-blue-700"
                disabled={loading}
              >
                {loading ? 'Chargement...' : '↻ Actualiser'}
              </button>
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {emails.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun email envoyé</p>
              ) : (
                emails.map((email) => (
                  <div key={email.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-gray-900">{email.subject}</div>
                        <div className="text-sm text-gray-600">À: {email.to}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(email.sentAt).toLocaleString('fr-FR')}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs px-2 py-1 rounded ${
                          email.status === 'sent' ? 'bg-green-100 text-green-800' :
                          email.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {email.status}
                        </span>
                        {email.deliveryStatus && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            email.deliveryStatus === 'delivered' ? 'bg-blue-100 text-blue-800' :
                            email.deliveryStatus === 'bounced' ? 'bg-red-100 text-red-800' :
                            email.deliveryStatus === 'complained' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {email.deliveryStatus}
                          </span>
                        )}
                      </div>
                    </div>

                    {email.error && (
                      <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded">
                        {email.error}
                      </div>
                    )}

                    {/* Boutons pour mettre à jour le statut de délivrabilité */}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => updateDeliveryStatus(email.id, 'delivered')}
                        className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                      >
                        Marquer livré
                      </button>
                      <button
                        onClick={() => updateDeliveryStatus(email.id, 'bounced')}
                        className="text-xs px-2 py-1 bg-red-50 text-red-700 rounded hover:bg-red-100"
                      >
                        Marquer rebond
                      </button>
                      <button
                        onClick={() => updateDeliveryStatus(email.id, 'complained')}
                        className="text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded hover:bg-orange-100"
                      >
                        Marquer spam
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Documentation */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 Instructions</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Account Name:</strong> L'adresse email doit être vérifiée dans votre console Alibaba Cloud DM</li>
            <li>• <strong>Credentials:</strong> Les clés sont configurées dans le code (à mettre dans .env en production)</li>
            <li>• <strong>Stockage:</strong> Les emails sont sauvegardés dans <code>emails-log.json</code> à la racine du projet</li>
            <li>• <strong>Délivrabilité:</strong> Utilisez les boutons pour simuler les statuts de livraison</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
