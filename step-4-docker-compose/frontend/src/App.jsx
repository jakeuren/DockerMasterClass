import { useState, useEffect } from 'react'

const API_BASE = '/api'

export default function App() {
  const [health, setHealth] = useState(null)
  const [users, setUsers] = useState([])
  const [inventory, setInventory] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState({})
  const [activeTab, setActiveTab] = useState('dashboard')
  const [orderForm, setOrderForm] = useState({ userId: '', itemId: '', quantity: 1 })
  const [notification, setNotification] = useState(null)

  const fetchData = async (endpoint, setter, key) => {
    setLoading(prev => ({ ...prev, [key]: true }))
    try {
      const res = await fetch(`${API_BASE}${endpoint}`)
      const data = await res.json()
      setter(data)
    } catch (err) {
      console.error(`Failed to fetch ${endpoint}:`, err)
    }
    setLoading(prev => ({ ...prev, [key]: false }))
  }

  const refreshAll = () => {
    fetchData('/health', setHealth, 'health')
    fetchData('/users', (d) => setUsers(d.users || []), 'users')
    fetchData('/inventory', (d) => setInventory(d.items || []), 'inventory')
    fetchData('/orders', (d) => setOrders(d.orders || []), 'orders')
  }

  useEffect(() => {
    refreshAll()
    const interval = setInterval(() => fetchData('/health', setHealth, 'health'), 5000)
    return () => clearInterval(interval)
  }, [])

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  const createOrder = async () => {
    if (!orderForm.userId || !orderForm.itemId) {
      showNotification('Select a user and item', 'error')
      return
    }
    setLoading(prev => ({ ...prev, createOrder: true }))
    try {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: orderForm.userId,
          items: [{ item_id: orderForm.itemId, quantity: parseInt(orderForm.quantity) }]
        })
      })
      const data = await res.json()
      if (res.ok) {
        showNotification(`Order ${data.id} created successfully`)
        setOrderForm({ userId: '', itemId: '', quantity: 1 })
        fetchData('/orders', (d) => setOrders(d.orders || []), 'orders')
        fetchData('/inventory', (d) => setInventory(d.items || []), 'inventory')
      } else {
        showNotification(data.error || 'Failed to create order', 'error')
      }
    } catch (err) {
      showNotification('Network error', 'error')
    }
    setLoading(prev => ({ ...prev, createOrder: false }))
  }

  const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false })

  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px',
        paddingBottom: '20px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '28px',
            fontWeight: 900,
            letterSpacing: '6px',
            color: 'var(--terminal-green)',
            textShadow: '0 0 30px var(--terminal-green-dim)'
          }}>
            MICROSERVICES
          </h1>
          <p style={{
            fontSize: '11px',
            letterSpacing: '4px',
            color: 'var(--text-secondary)',
            marginTop: '4px'
          }}>
            CONTROL CENTER // .NET 9 + DOCKER
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            color: 'var(--terminal-cyan)',
            letterSpacing: '2px'
          }}>
            {currentTime}
          </div>
          <button onClick={refreshAll} disabled={loading.health}>
            {loading.health ? 'SYNCING' : 'REFRESH'}
          </button>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          padding: '16px 24px',
          background: notification.type === 'error' ? 'var(--terminal-red)' : 'var(--terminal-green)',
          color: 'var(--bg-primary)',
          fontWeight: 600,
          letterSpacing: '1px',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease'
        }}>
          {notification.message}
        </div>
      )}

      {/* Navigation Tabs */}
      <nav style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px'
      }}>
        {['dashboard', 'users', 'inventory', 'orders'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? 'var(--terminal-green-dim)' : 'transparent',
              borderColor: activeTab === tab ? 'var(--terminal-green)' : 'var(--border-color)',
              color: activeTab === tab ? 'var(--terminal-green)' : 'var(--text-secondary)'
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </nav>

      {/* Dashboard View */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          {/* Health Status Panel */}
          <div className="panel">
            <div className="panel-header">
              <span className={`status-indicator ${health?.status === 'healthy' ? 'status-healthy' : 'status-unhealthy'}`} />
              System Status
            </div>
            <div className="panel-body">
              {health?.services ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(health.services).map(([name, status]) => (
                    <div key={name} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <span style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>{name}</span>
                      <span style={{
                        color: status === 'healthy' ? 'var(--terminal-green)' :
                               status === 'unhealthy' ? 'var(--terminal-red)' : 'var(--terminal-amber)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <span className={`status-indicator ${
                          status === 'healthy' ? 'status-healthy' :
                          status === 'unhealthy' ? 'status-unhealthy' : 'status-unknown'
                        }`} />
                        {status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="loading" style={{ color: 'var(--text-secondary)' }}>Loading</p>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="panel">
            <div className="panel-header">
              <span style={{ color: 'var(--terminal-cyan)' }}>◈</span>
              Statistics
            </div>
            <div className="panel-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <StatBox label="Users" value={users.length} color="var(--terminal-cyan)" />
                <StatBox label="Items" value={inventory.length} color="var(--terminal-purple)" />
                <StatBox label="Orders" value={orders.length} color="var(--terminal-amber)" />
                <StatBox
                  label="Total Stock"
                  value={inventory.reduce((sum, i) => sum + (i.quantity || 0), 0)}
                  color="var(--terminal-green)"
                />
              </div>
            </div>
          </div>

          {/* Create Order Panel */}
          <div className="panel" style={{ gridColumn: 'span 2' }}>
            <div className="panel-header">
              <span style={{ color: 'var(--terminal-amber)' }}>+</span>
              Create Order
            </div>
            <div className="panel-body">
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', letterSpacing: '2px', color: 'var(--text-secondary)' }}>
                    USER
                  </label>
                  <select
                    value={orderForm.userId}
                    onChange={e => setOrderForm({ ...orderForm, userId: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select user...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', letterSpacing: '2px', color: 'var(--text-secondary)' }}>
                    ITEM
                  </label>
                  <select
                    value={orderForm.itemId}
                    onChange={e => setOrderForm({ ...orderForm, itemId: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    <option value="">Select item...</option>
                    {inventory.map(i => (
                      <option key={i.id} value={i.id}>{i.name} (${i.price} - {i.quantity} in stock)</option>
                    ))}
                  </select>
                </div>
                <div style={{ width: '100px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '11px', letterSpacing: '2px', color: 'var(--text-secondary)' }}>
                    QTY
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={orderForm.quantity}
                    onChange={e => setOrderForm({ ...orderForm, quantity: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <button
                  onClick={createOrder}
                  disabled={loading.createOrder}
                  style={{ borderColor: 'var(--terminal-amber)', color: 'var(--terminal-amber)' }}
                >
                  {loading.createOrder ? 'PROCESSING' : 'EXECUTE ORDER'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users View */}
      {activeTab === 'users' && (
        <div className="panel">
          <div className="panel-header">
            <span style={{ color: 'var(--terminal-cyan)' }}>◉</span>
            User Registry
            <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {users.length} records
            </span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--terminal-green)' }}>{user.id}</td>
                    <td>{user.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inventory View */}
      {activeTab === 'inventory' && (
        <div className="panel">
          <div className="panel-header">
            <span style={{ color: 'var(--terminal-purple)' }}>◈</span>
            Inventory Manifest
            <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {inventory.length} items
            </span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--terminal-purple)' }}>{item.id}</td>
                    <td>{item.name}</td>
                    <td>
                      <span style={{
                        color: item.quantity > 50 ? 'var(--terminal-green)' :
                               item.quantity > 20 ? 'var(--terminal-amber)' : 'var(--terminal-red)'
                      }}>
                        {item.quantity}
                      </span>
                    </td>
                    <td style={{ color: 'var(--terminal-cyan)' }}>${item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders View */}
      {activeTab === 'orders' && (
        <div className="panel">
          <div className="panel-header">
            <span style={{ color: 'var(--terminal-amber)' }}>◆</span>
            Order Ledger
            <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {orders.length} transactions
            </span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>User</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--terminal-amber)' }}>{order.id}</td>
                    <td>{users.find(u => u.id === order.userId || u.id === order.user_id)?.name || order.userId || order.user_id}</td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {order.items?.map(i => `${i.item_id || i.itemId} ×${i.quantity}`).join(', ')}
                    </td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        fontSize: '10px',
                        letterSpacing: '1px',
                        background: order.status === 'completed' ? 'var(--terminal-green)' :
                                   order.status === 'pending' ? 'var(--terminal-amber)' : 'var(--terminal-red)',
                        color: 'var(--bg-primary)'
                      }}>
                        {order.status?.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {order.createdAt || order.created_at ? new Date(order.createdAt || order.created_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        marginTop: '48px',
        paddingTop: '24px',
        borderTop: '1px solid var(--border-color)',
        textAlign: 'center',
        fontSize: '11px',
        color: 'var(--text-muted)',
        letterSpacing: '2px'
      }}>
        DOCKER MICROSERVICES DEMO // .NET 9 + REACT + VITE
        <span className="cursor" />
      </footer>
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      padding: '16px',
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border-color)',
      textAlign: 'center'
    }}>
      <div style={{
        fontSize: '32px',
        fontFamily: 'var(--font-display)',
        color,
        fontWeight: 700,
        textShadow: `0 0 20px ${color}40`
      }}>
        {value}
      </div>
      <div style={{
        fontSize: '10px',
        letterSpacing: '2px',
        color: 'var(--text-secondary)',
        marginTop: '8px',
        textTransform: 'uppercase'
      }}>
        {label}
      </div>
    </div>
  )
}
