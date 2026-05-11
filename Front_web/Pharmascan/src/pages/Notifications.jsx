import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { RefreshCw, Trash2 } from 'lucide-react'

export default function Notifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchNotifications()
  }, [user])

  const fetchNotifications = async () => {
    if (!user?.id) {
      setNotifications([])
      setLoading(false)
      return
    }
    try {
      const { data: pharmacist } = await supabase
        .from('pharmacien')
        .select('pharmacie_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (pharmacist?.pharmacie_id) {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('pharmacie_id', pharmacist.pharmacie_id)
          .order('cree_le', { ascending: false })

        if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01') {
            setNotifications([])
          } else {
            console.warn('Notifications:', error.message)
            setNotifications([])
          }
        } else {
          setNotifications(data || [])
        }
      } else {
        setNotifications([])
      }
    } catch (error) {
      setNotifications([])
      if (error?.code !== 'PGRST205') console.warn('Notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id)
      if (error) throw error
      setNotifications(notifications.filter((n) => n.id !== id))
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const formatTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now - date) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-white min-h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">Notifications</h1>
        <button
          onClick={fetchNotifications}
          className="flex items-center gap-2 px-6 py-3.5 bg-[#0b8fac] text-white rounded-xl hover:bg-[#0a7085] transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 border-2 border-[#0b8fac] hover:border-[#0a7085]"
        >
          <RefreshCw className="h-5 w-5" />
          <span>Actualiser</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Chargement...</div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-gray-500">
                    Aucune notification
                  </td>
                </tr>
              ) : (
                notifications.map((notification) => (
                  <tr 
                    key={notification.id} 
                    className={`hover:bg-gray-50 ${!notification.lu ? 'bg-blue-50' : ''}`}
                    onClick={async () => {
                      // Marquer comme lu au clic
                      if (!notification.lu) {
                        try {
                          await supabase
                            .from('notifications')
                            .update({ lu: true })
                            .eq('id', notification.id)
                          // Mettre à jour l'état local
                          setNotifications(notifications.map(n => 
                            n.id === notification.id ? { ...n, lu: true } : n
                          ))
                        } catch (error) {
                          console.error('Erreur:', error)
                        }
                      }
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {!notification.lu && (
                        <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      )}
                      {notification.description || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTime(notification.cree_le)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(notification.id)
                        }}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

