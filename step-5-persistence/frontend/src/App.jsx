import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  MarkerType,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

const API_BASE = '/api'

// Service Node Component - Refined cyberpunk aesthetic
function ServiceNode({ data }) {
  const isActive = data.isActive
  const colorSchemes = {
    frontend: {
      primary: '#00d4ff',
      glow: 'rgba(0, 212, 255, 0.5)',
      bg: 'rgba(0, 212, 255, 0.08)',
      icon: '◈'
    },
    gateway: {
      primary: '#a855f7',
      glow: 'rgba(168, 85, 247, 0.5)',
      bg: 'rgba(168, 85, 247, 0.08)',
      icon: '⬡'
    },
    service: {
      primary: '#00ff9d',
      glow: 'rgba(0, 255, 157, 0.5)',
      bg: 'rgba(0, 255, 157, 0.08)',
      icon: '▣'
    },
    database: {
      primary: '#ff6b6b',
      glow: 'rgba(255, 107, 107, 0.5)',
      bg: 'rgba(255, 107, 107, 0.08)',
      icon: '◉'
    },
  }
  const scheme = colorSchemes[data.type] || colorSchemes.service

  return (
    <div style={{
      background: isActive ? scheme.bg : 'rgba(10, 14, 20, 0.95)',
      border: `1px solid ${isActive ? scheme.primary : 'rgba(30, 40, 50, 0.8)'}`,
      borderRadius: '8px',
      padding: '14px 20px',
      minWidth: '120px',
      textAlign: 'center',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      boxShadow: isActive
        ? `0 0 40px ${scheme.glow}, inset 0 0 20px ${scheme.glow}`
        : '0 4px 20px rgba(0, 0, 0, 0.4)',
      backdropFilter: 'blur(8px)',
      position: 'relative',
    }}>
      {/* Connection handles */}
      {data.type !== 'frontend' && (
        <Handle
          type="target"
          position={Position.Top}
          style={{
            background: scheme.primary,
            border: `2px solid ${isActive ? '#fff' : scheme.primary}`,
            width: 10,
            height: 10,
            transition: 'all 0.3s ease',
          }}
        />
      )}

      {/* Node content */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '6px'
      }}>
        <span style={{
          fontSize: '14px',
          color: isActive ? scheme.primary : '#4a5568',
          filter: isActive ? `drop-shadow(0 0 6px ${scheme.primary})` : 'none',
          transition: 'all 0.3s ease',
        }}>
          {scheme.icon}
        </span>
        <span style={{
          fontFamily: "'Orbitron', monospace",
          fontSize: '11px',
          fontWeight: '700',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: isActive ? '#fff' : '#8892a0',
          textShadow: isActive ? `0 0 10px ${scheme.primary}` : 'none',
          transition: 'all 0.3s ease',
        }}>
          {data.label}
        </span>
      </div>

      {/* Port badge */}
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '10px',
        color: isActive ? scheme.primary : '#5a6574',
        background: isActive ? `${scheme.primary}15` : 'rgba(30, 40, 50, 0.5)',
        padding: '3px 10px',
        borderRadius: '4px',
        display: 'inline-block',
        letterSpacing: '0.05em',
        transition: 'all 0.3s ease',
      }}>
        {data.port}
      </div>

      {data.type !== 'database' && (
        <Handle
          type="source"
          position={Position.Bottom}
          style={{
            background: scheme.primary,
            border: `2px solid ${isActive ? '#fff' : scheme.primary}`,
            width: 10,
            height: 10,
            transition: 'all 0.3s ease',
          }}
        />
      )}
    </div>
  )
}

const nodeTypes = { service: ServiceNode }

// Architecture Diagram Component - Refined layout with proper spacing
function ArchitectureDiagram({ activeNodes, activeConnections, running, replayIndex, flowHistory }) {
  // Improved spacing: proper tier separation for visual hierarchy
  const baseNodes = [
    // Tier 1: Client
    { id: 'frontend', type: 'service', position: { x: 180, y: 0 }, data: { label: 'Frontend', port: ':3000', type: 'frontend' } },
    // Tier 2: Gateway
    { id: 'gateway', type: 'service', position: { x: 180, y: 100 }, data: { label: 'Gateway', port: ':5000', type: 'gateway' } },
    // Tier 3: Services - spread horizontally with equal spacing
    { id: 'users', type: 'service', position: { x: 0, y: 220 }, data: { label: 'Users', port: ':5001', type: 'service' } },
    { id: 'orders', type: 'service', position: { x: 180, y: 220 }, data: { label: 'Orders', port: ':5002', type: 'service' } },
    { id: 'inventory', type: 'service', position: { x: 360, y: 220 }, data: { label: 'Inventory', port: ':5003', type: 'service' } },
    // Tier 4: Data
    { id: 'postgres', type: 'service', position: { x: 180, y: 340 }, data: { label: 'PostgreSQL', port: ':5432', type: 'database' } },
  ]

  const baseEdges = [
    { id: 'e1', source: 'frontend', target: 'gateway' },
    { id: 'e2', source: 'gateway', target: 'users' },
    { id: 'e3', source: 'gateway', target: 'orders' },
    { id: 'e4', source: 'gateway', target: 'inventory' },
    { id: 'e5', source: 'users', target: 'postgres' },
    { id: 'e6', source: 'orders', target: 'postgres' },
    { id: 'e7', source: 'inventory', target: 'postgres' },
  ]

  const nodes = useMemo(() =>
    baseNodes.map(n => ({ ...n, data: { ...n.data, isActive: activeNodes.includes(n.id) } })),
    [activeNodes]
  )

  const edges = useMemo(() =>
    baseEdges.map(e => {
      const key = `${e.source}-${e.target}`
      const isActive = activeConnections.includes(key)
      return {
        ...e,
        animated: isActive,
        style: {
          stroke: isActive ? '#00ff9d' : 'rgba(30, 40, 50, 0.6)',
          strokeWidth: isActive ? 2.5 : 1.5,
          filter: isActive ? 'drop-shadow(0 0 4px rgba(0, 255, 157, 0.6))' : 'none',
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isActive ? '#00ff9d' : 'rgba(30, 40, 50, 0.6)',
          width: 18,
          height: 18,
        },
      }
    }),
    [activeConnections]
  )

  const isReplaying = replayIndex >= 0
  const statusText = running ? 'EXECUTING' : isReplaying ? `STEP ${replayIndex + 1}/${flowHistory.length}` : 'STANDBY'
  const statusColor = running ? '#00ff9d' : isReplaying ? '#ffb800' : '#4a5568'

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(3, 5, 8, 0.98) 0%, rgba(8, 12, 18, 0.98) 100%)',
      border: '1px solid rgba(30, 40, 50, 0.8)',
      borderRadius: '12px',
      height: '100%',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header bar */}
      <div style={{
        padding: '14px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        borderBottom: '1px solid rgba(30, 40, 50, 0.6)',
        background: 'rgba(10, 14, 20, 0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: statusColor,
            boxShadow: `0 0 12px ${statusColor}`,
            animation: running ? 'pulse 1.5s infinite' : 'none',
          }} />
          <span style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: '10px',
            fontWeight: '600',
            letterSpacing: '0.15em',
            color: '#8892a0',
            textTransform: 'uppercase',
          }}>
            Architecture
          </span>
        </div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '10px',
          fontWeight: '500',
          letterSpacing: '0.08em',
          color: statusColor,
          padding: '4px 12px',
          background: `${statusColor}15`,
          borderRadius: '4px',
          border: `1px solid ${statusColor}30`,
        }}>
          {statusText}
        </div>
      </div>

      {/* ReactFlow container */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3, minZoom: 0.5, maxZoom: 1.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnScroll={false}
          panOnScroll={false}
          panOnDrag={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            color="rgba(30, 40, 50, 0.4)"
            gap={24}
            size={1}
            style={{ background: 'transparent' }}
          />
        </ReactFlow>

        {/* Decorative corner accents */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          width: '20px',
          height: '20px',
          borderLeft: '2px solid rgba(0, 212, 255, 0.3)',
          borderTop: '2px solid rgba(0, 212, 255, 0.3)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '20px',
          height: '20px',
          borderRight: '2px solid rgba(0, 212, 255, 0.3)',
          borderTop: '2px solid rgba(0, 212, 255, 0.3)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          width: '20px',
          height: '20px',
          borderLeft: '2px solid rgba(0, 212, 255, 0.3)',
          borderBottom: '2px solid rgba(0, 212, 255, 0.3)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          width: '20px',
          height: '20px',
          borderRight: '2px solid rgba(0, 212, 255, 0.3)',
          borderBottom: '2px solid rgba(0, 212, 255, 0.3)',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  )
}

// Trace Log Component - Refined timeline visualization
function TraceLog({ flowSteps, isComplete, running, replayIndex, flowHistory, onGoToStep, onPrev, onNext, onExitReplay }) {
  const isReplaying = replayIndex >= 0
  const statusColor = running ? '#00ff9d' : flowSteps.length > 0 ? '#ffb800' : '#4a5568'

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(3, 5, 8, 0.98) 0%, rgba(8, 12, 18, 0.98) 100%)',
      border: '1px solid rgba(30, 40, 50, 0.8)',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px',
        borderBottom: '1px solid rgba(30, 40, 50, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        background: 'rgba(10, 14, 20, 0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: statusColor,
            boxShadow: `0 0 12px ${statusColor}`,
            animation: running ? 'pulse 1.5s infinite' : 'none',
          }} />
          <span style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: '10px',
            fontWeight: '600',
            letterSpacing: '0.15em',
            color: '#8892a0',
            textTransform: 'uppercase',
          }}>
            Execution Trace
          </span>
        </div>
        {flowSteps.length > 0 && (
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            color: '#6b7d8f',
            padding: '4px 10px',
            background: 'rgba(30, 40, 50, 0.5)',
            borderRadius: '4px',
          }}>
            {flowSteps.length} steps
          </div>
        )}
      </div>

      {/* Log lines with timeline */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 0',
        position: 'relative',
      }}>
        {/* Timeline bar */}
        {flowSteps.length > 0 && (
          <div style={{
            position: 'absolute',
            left: '24px',
            top: '20px',
            bottom: '20px',
            width: '2px',
            background: 'linear-gradient(180deg, rgba(30, 40, 50, 0.3) 0%, rgba(0, 255, 157, 0.3) 50%, rgba(30, 40, 50, 0.3) 100%)',
            borderRadius: '1px',
            zIndex: 0,
          }} />
        )}
        {flowSteps.length === 0 ? (
          <div style={{
            padding: '24px',
            color: '#5a6574',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12px',
            textAlign: 'center',
            opacity: 0.8,
          }}>
            Run a test to see execution trace...
          </div>
        ) : (
          flowSteps.map((step, i) => {
            const isCurrentStep = isReplaying && i === replayIndex
            const isLast = i === flowSteps.length - 1
            const stepColor = step.type === 'error' ? '#ff6b6b' : step.type === 'success' ? '#00ff9d' : '#8892a0'

            return (
              <div
                key={i}
                onClick={() => isComplete && !running && onGoToStep(i)}
                className={!isComplete ? 'animate-fade-up' : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 16px 8px 12px',
                  cursor: isComplete && !running ? 'pointer' : 'default',
                  background: isCurrentStep ? 'rgba(255, 184, 0, 0.1)' : 'transparent',
                  borderLeft: isCurrentStep ? '3px solid #ffb800' : '3px solid transparent',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {/* Timeline node */}
                <div style={{
                  width: '26px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: '12px',
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: isCurrentStep ? '12px' : '8px',
                    height: isCurrentStep ? '12px' : '8px',
                    borderRadius: '50%',
                    background: isCurrentStep ? '#ffb800' : stepColor,
                    boxShadow: isCurrentStep
                      ? '0 0 12px #ffb800, 0 0 20px rgba(255, 184, 0, 0.4)'
                      : (step.type === 'success' && isLast)
                        ? `0 0 10px ${stepColor}`
                        : 'none',
                    border: `2px solid ${isCurrentStep ? '#fff' : 'transparent'}`,
                    transition: 'all 0.25s ease',
                  }} />
                </div>

                {/* Step number */}
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '10px',
                  fontWeight: '600',
                  color: isCurrentStep ? '#ffb800' : '#4a5568',
                  minWidth: '24px',
                  marginRight: '12px',
                  userSelect: 'none',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>

                {/* Message */}
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '11px',
                  color: isCurrentStep ? '#fff' : stepColor,
                  flex: 1,
                  lineHeight: 1.4,
                }}>
                  {step.message}
                </span>
              </div>
            )
          })
        )}
      </div>

      {/* Replay controls */}
      {isComplete && !running && flowHistory.length > 0 && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid rgba(30, 40, 50, 0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
          background: 'rgba(10, 14, 20, 0.5)',
        }}>
          <span style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: '9px',
            fontWeight: '600',
            letterSpacing: '0.1em',
            color: '#ffb800',
          }}>
            REPLAY
          </span>

          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
            <button
              onClick={() => onGoToStep(0)}
              disabled={replayIndex === 0}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                background: 'rgba(30, 40, 50, 0.5)',
                border: '1px solid rgba(60, 70, 80, 0.5)',
                borderRadius: '4px',
                color: replayIndex === 0 ? '#3a4550' : '#8892a0',
                cursor: replayIndex === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >⏮</button>
            <button
              onClick={onPrev}
              disabled={replayIndex <= 0}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                background: 'rgba(30, 40, 50, 0.5)',
                border: '1px solid rgba(60, 70, 80, 0.5)',
                borderRadius: '4px',
                color: replayIndex <= 0 ? '#3a4550' : '#8892a0',
                cursor: replayIndex <= 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >◀</button>
          </div>

          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '11px',
            fontWeight: '500',
            color: isReplaying ? '#ffb800' : '#5a6574',
            minWidth: '50px',
            textAlign: 'center',
            padding: '4px 8px',
            background: isReplaying ? 'rgba(255, 184, 0, 0.1)' : 'transparent',
            borderRadius: '4px',
          }}>
            {isReplaying ? `${replayIndex + 1} / ${flowHistory.length}` : '—'}
          </span>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={onNext}
              disabled={replayIndex >= flowHistory.length - 1}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                background: 'rgba(30, 40, 50, 0.5)',
                border: '1px solid rgba(60, 70, 80, 0.5)',
                borderRadius: '4px',
                color: replayIndex >= flowHistory.length - 1 ? '#3a4550' : '#8892a0',
                cursor: replayIndex >= flowHistory.length - 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >▶</button>
            <button
              onClick={() => onGoToStep(flowHistory.length - 1)}
              disabled={replayIndex >= flowHistory.length - 1}
              style={{
                padding: '6px 10px',
                fontSize: '11px',
                background: 'rgba(30, 40, 50, 0.5)',
                border: '1px solid rgba(60, 70, 80, 0.5)',
                borderRadius: '4px',
                color: replayIndex >= flowHistory.length - 1 ? '#3a4550' : '#8892a0',
                cursor: replayIndex >= flowHistory.length - 1 ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >⏭</button>
          </div>

          {isReplaying && (
            <button
              onClick={onExitReplay}
              style={{
                marginLeft: 'auto',
                padding: '6px 14px',
                fontSize: '10px',
                fontWeight: '600',
                background: 'rgba(255, 107, 107, 0.15)',
                border: '1px solid rgba(255, 107, 107, 0.4)',
                color: '#ff6b6b',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >EXIT</button>
          )}
        </div>
      )}
    </div>
  )
}

// Test Card Component - Refined styling
function TestCard({ test, isRunning, isDisabled, result, onRun }) {
  const statusColor = isRunning ? '#00ff9d'
    : result?.success === true ? '#00ff9d'
    : result?.success === false ? '#ff6b6b'
    : '#4a5568'

  return (
    <div style={{
      background: isRunning
        ? 'rgba(0, 255, 157, 0.06)'
        : result?.success === true
          ? 'rgba(0, 255, 157, 0.04)'
          : result?.success === false
            ? 'rgba(255, 107, 107, 0.04)'
            : 'rgba(10, 14, 20, 0.8)',
      border: `1px solid ${isRunning ? 'rgba(0, 255, 157, 0.5)' : result?.success === true ? 'rgba(0, 255, 157, 0.25)' : result?.success === false ? 'rgba(255, 107, 107, 0.25)' : 'rgba(30, 40, 50, 0.6)'}`,
      borderRadius: '8px',
      padding: '14px 16px',
      opacity: isDisabled ? 0.35 : 1,
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isRunning ? 'scale(1.01)' : 'scale(1)',
      boxShadow: isRunning ? '0 4px 20px rgba(0, 255, 157, 0.15)' : '0 2px 8px rgba(0, 0, 0, 0.2)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
        <div style={{ flex: 1, marginRight: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: statusColor,
              boxShadow: isRunning || result ? `0 0 10px ${statusColor}` : 'none',
              transition: 'all 0.3s ease',
            }} />
            <span style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: '11px',
              fontWeight: '700',
              letterSpacing: '0.06em',
              color: isRunning ? '#00ff9d' : '#e4e8ec',
              textShadow: isRunning ? '0 0 8px rgba(0, 255, 157, 0.5)' : 'none',
            }}>
              {test.name}
            </span>
          </div>
          {test.error && (
            <span style={{
              display: 'inline-block',
              fontSize: '8px',
              fontWeight: '600',
              padding: '3px 8px',
              background: 'rgba(255, 184, 0, 0.12)',
              border: '1px solid rgba(255, 184, 0, 0.35)',
              color: '#ffb800',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              borderRadius: '3px',
              marginTop: '4px',
            }}>
              EXPECTS ERROR
            </span>
          )}
        </div>
        <button
          onClick={onRun}
          disabled={isDisabled}
          style={{
            padding: '8px 16px',
            fontSize: '10px',
            fontWeight: '700',
            letterSpacing: '0.1em',
            background: isRunning
              ? 'transparent'
              : 'linear-gradient(180deg, #00ff9d 0%, #00d485 100%)',
            border: isRunning ? '1px solid #00ff9d' : 'none',
            color: isRunning ? '#00ff9d' : '#030508',
            borderRadius: '6px',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: isRunning ? 'none' : '0 2px 8px rgba(0, 255, 157, 0.3)',
            minWidth: '80px',
          }}
        >
          {isRunning ? 'RUNNING' : 'RUN'}
        </button>
      </div>
      <p style={{
        fontSize: '11px',
        color: '#6b7d8f',
        lineHeight: 1.5,
        margin: 0,
        fontFamily: "'IBM Plex Mono', monospace",
      }}>
        {test.desc}
      </p>
    </div>
  )
}

// Main App Component
export default function App() {
  const [view, setView] = useState('testlab')
  const [health, setHealth] = useState(null)
  const [users, setUsers] = useState([])
  const [inventory, setInventory] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState({})
  const [notification, setNotification] = useState(null)

  const fetchData = useCallback(async (endpoint, setter, key) => {
    setLoading(prev => ({ ...prev, [key]: true }))
    try {
      const res = await fetch(`${API_BASE}${endpoint}`)
      const data = await res.json()
      setter(data)
    } catch (err) {
      console.error(err)
    }
    setLoading(prev => ({ ...prev, [key]: false }))
  }, [])

  const refreshAll = useCallback(() => {
    fetchData('/health', setHealth, 'health')
    fetchData('/users', d => setUsers(d.users || []), 'users')
    fetchData('/inventory', d => setInventory(d.items || []), 'inventory')
    fetchData('/orders', d => setOrders(d.orders || []), 'orders')
  }, [fetchData])

  useEffect(() => {
    refreshAll()
    const interval = setInterval(() => fetchData('/health', setHealth, 'health'), 5000)
    return () => clearInterval(interval)
  }, [refreshAll, fetchData])

  const notify = (msg, type = 'success') => {
    setNotification({ message: msg, type })
    setTimeout(() => setNotification(null), 4000)
  }

  return (
    <div style={{ height: '100vh', padding: '20px 28px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexShrink: 0 }}>
        <div>
          <h1 style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: '24px',
            fontWeight: '700',
            letterSpacing: '0.12em',
            color: '#e4e8ec',
            marginBottom: '4px',
          }}>
            <span style={{ color: '#00ff9d', textShadow: '0 0 20px rgba(0, 255, 157, 0.5)' }}>MICRO</span>SERVICES
          </h1>
          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#6b7d8f', letterSpacing: '0.08em' }}>
            DOCKER WORKSHOP // POSTGRESQL PERSISTENCE LAYER
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className={`badge ${health?.status === 'healthy' ? 'badge-success' : 'badge-danger'}`}>
            <div className={`status-dot ${health?.status === 'healthy' ? 'status-healthy' : 'status-error'}`} />
            {health?.status?.toUpperCase() || 'CHECKING'}
          </div>
          <button onClick={refreshAll} disabled={loading.health}>
            {loading.health ? 'SYNCING...' : 'REFRESH'}
          </button>
        </div>
      </header>

      {notification && <div className={`toast toast-${notification.type}`}>{notification.message}</div>}

      {/* Navigation */}
      <nav style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid #1e2832', paddingBottom: '1px', flexShrink: 0 }}>
        {[
          { id: 'testlab', label: 'Test Lab' },
          { id: 'dashboard', label: 'Dashboard' },
          { id: 'users', label: 'Users' },
          { id: 'inventory', label: 'Inventory' },
          { id: 'orders', label: 'Orders' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              background: view === tab.id ? '#0f1419' : 'transparent',
              borderColor: view === tab.id ? '#00ff9d' : 'transparent',
              borderBottom: view === tab.id ? '2px solid #00ff9d' : '2px solid transparent',
              color: view === tab.id ? '#00ff9d' : '#6b7d8f',
              marginBottom: '-2px',
              borderRadius: 0,
              padding: '10px 20px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {view === 'testlab' && <TestLab users={users} inventory={inventory} refresh={refreshAll} notify={notify} />}
        {view === 'dashboard' && <Dashboard health={health} users={users} inventory={inventory} orders={orders} />}
        {view === 'users' && <Users users={users} refresh={() => fetchData('/users', d => setUsers(d.users || []), 'users')} notify={notify} />}
        {view === 'inventory' && <Inventory inventory={inventory} refresh={() => fetchData('/inventory', d => setInventory(d.items || []), 'inventory')} notify={notify} />}
        {view === 'orders' && <Orders orders={orders} users={users} inventory={inventory} refresh={refreshAll} notify={notify} />}
      </div>

      {/* Footer */}
      <footer style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1e2832', display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7d8f', fontFamily: "'IBM Plex Mono', monospace", flexShrink: 0 }}>
        <span>STEP 5: PERSISTENCE</span>
        <span>.NET 9 + POSTGRESQL + REACT</span>
      </footer>
    </div>
  )
}

// Test Lab Component
function TestLab({ users, inventory, refresh, notify }) {
  const [results, setResults] = useState({})
  const [running, setRunning] = useState(null)
  const [activeNodes, setActiveNodes] = useState([])
  const [activeConnections, setActiveConnections] = useState([])
  const [flowSteps, setFlowSteps] = useState([])
  const [flowHistory, setFlowHistory] = useState([])
  const [replayIndex, setReplayIndex] = useState(-1)
  const [isComplete, setIsComplete] = useState(false)

  const sleep = ms => new Promise(r => setTimeout(r, ms))

  const animate = async (nodes, connections, message, type = 'info') => {
    const step = { nodes, connections, message, type }
    setFlowHistory(prev => [...prev, step])
    setActiveNodes(nodes)
    setActiveConnections(connections)
    setFlowSteps(prev => [...prev, { message, type }])
    await sleep(600)
  }

  const goToStep = (index) => {
    if (index < 0 || index >= flowHistory.length) return
    setReplayIndex(index)
    const step = flowHistory[index]
    setActiveNodes(step.nodes)
    setActiveConnections(step.connections)
  }

  const prevStep = () => goToStep(replayIndex - 1)
  const nextStep = () => goToStep(replayIndex + 1)
  const exitReplay = () => {
    setReplayIndex(-1)
    setActiveNodes([])
    setActiveConnections([])
  }

  const runTest = async (test) => {
    setRunning(test.id)
    setResults(prev => ({ ...prev, [test.id]: null }))
    setFlowSteps([])
    setFlowHistory([])
    setActiveNodes([])
    setActiveConnections([])
    setReplayIndex(-1)
    setIsComplete(false)

    try {
      const result = await test.run(animate)
      setResults(prev => ({ ...prev, [test.id]: result }))
      setActiveNodes([])
      setActiveConnections([])
      await animate([], [], result.success ? '> TEST PASSED' : '> TEST FAILED', result.success ? 'success' : 'error')
      notify(result.success ? `${test.name} - PASS` : `${test.name} - FAIL`, result.success ? 'success' : 'error')
      setIsComplete(true)
    } catch (e) {
      setResults(prev => ({ ...prev, [test.id]: { success: false, error: e.message } }))
      await animate([], [], `> ERROR: ${e.message}`, 'error')
      setIsComplete(true)
    }

    setRunning(null)
    refresh()
  }

  const tests = [
    {
      id: 'health',
      name: 'Health Check',
      desc: 'Verify all services and database connections',
      run: async (anim) => {
        await anim(['frontend'], [], 'Initiating system health check')
        await anim(['frontend', 'gateway'], ['frontend-gateway'], 'Frontend -> API Gateway')
        await anim(['gateway', 'users'], ['gateway-users'], 'Checking Users service')
        await anim(['users', 'postgres'], ['users-postgres'], 'Users -> PostgreSQL')
        await anim(['gateway', 'orders'], ['gateway-orders'], 'Checking Orders service')
        await anim(['orders', 'postgres'], ['orders-postgres'], 'Orders -> PostgreSQL')
        await anim(['gateway', 'inventory'], ['gateway-inventory'], 'Checking Inventory service')
        await anim(['inventory', 'postgres'], ['inventory-postgres'], 'Inventory -> PostgreSQL')
        const res = await fetch(`${API_BASE}/health`)
        const data = await res.json()
        await anim(['frontend', 'gateway'], ['frontend-gateway'], 'Aggregating health status')
        return { success: data.status === 'healthy', data }
      }
    },
    {
      id: 'create-user',
      name: 'Create User',
      desc: 'Create new user and persist to database',
      run: async (anim) => {
        const name = `User_${Date.now().toString(36).toUpperCase()}`
        await anim(['frontend'], [], `Creating user: ${name}`)
        await anim(['frontend', 'gateway'], ['frontend-gateway'], 'POST /users -> Gateway')
        await anim(['gateway', 'users'], ['gateway-users'], 'Gateway -> Users Service')
        await anim(['users', 'postgres'], ['users-postgres'], 'INSERT INTO users...')
        const res = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        })
        const data = await res.json()
        await anim(['frontend', 'gateway'], ['frontend-gateway'], `User created: ID ${data.id}`)
        return { success: res.ok, data }
      }
    },
    {
      id: 'create-order',
      name: 'Create Order (Cross-Service)',
      desc: 'Order creation with user validation and inventory check',
      run: async (anim) => {
        if (!users[0] || !inventory[0]) return { success: false, error: 'Need user and inventory' }
        await anim(['frontend'], [], `Creating order for user ${users[0].id}`)
        await anim(['frontend', 'gateway'], ['frontend-gateway'], 'POST /orders -> Gateway')
        await anim(['gateway', 'orders'], ['gateway-orders'], 'Gateway -> Orders Service')
        await anim(['orders', 'users'], ['orders-users'], 'Validating user exists...')
        await anim(['users', 'postgres'], ['users-postgres'], 'SELECT FROM users')
        await anim(['orders', 'inventory'], ['orders-inventory'], 'Checking inventory...')
        await anim(['inventory', 'postgres'], ['inventory-postgres'], 'SELECT FROM inventory')
        await anim(['orders', 'postgres'], ['orders-postgres'], 'INSERT INTO orders')
        const res = await fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: users[0].id, items: [{ item_id: inventory[0].id, quantity: 1 }] })
        })
        const data = await res.json()
        await anim(['frontend', 'gateway'], ['frontend-gateway'], `Order ${data.id || 'ERROR'}`)
        return { success: res.ok, data }
      }
    },
    {
      id: 'invalid-user',
      name: 'Order (Invalid User)',
      desc: 'Cross-service validation failure demonstration',
      error: true,
      run: async (anim) => {
        if (!inventory[0]) return { success: false, error: 'No inventory' }
        await anim(['frontend'], [], 'Order with fake user ID')
        await anim(['frontend', 'gateway'], ['frontend-gateway'], 'POST /orders -> Gateway')
        await anim(['gateway', 'orders'], ['gateway-orders'], 'Gateway -> Orders')
        await anim(['orders', 'users'], ['orders-users'], 'Validating user "INVALID"')
        await anim(['users', 'postgres'], ['users-postgres'], 'SELECT FROM users WHERE id=INVALID')
        await anim(['orders'], [], 'USER NOT FOUND - Rejecting')
        const res = await fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: 'INVALID', items: [{ item_id: inventory[0].id, quantity: 1 }] })
        })
        const data = await res.json()
        await anim(['frontend', 'gateway'], ['frontend-gateway'], 'Error: User not found')
        return { success: res.status === 400, data }
      }
    },
    {
      id: 'insufficient',
      name: 'Reserve (Insufficient)',
      desc: 'Inventory validation at service level',
      error: true,
      run: async (anim) => {
        if (!inventory[0]) return { success: false, error: 'No inventory' }
        await anim(['frontend'], [], `Reserve 999,999 x ${inventory[0].id}`)
        await anim(['frontend', 'gateway'], ['frontend-gateway'], 'POST /inventory/reserve')
        await anim(['gateway', 'inventory'], ['gateway-inventory'], 'Gateway -> Inventory')
        await anim(['inventory', 'postgres'], ['inventory-postgres'], 'SELECT quantity')
        await anim(['inventory'], [], `Stock ${inventory[0].quantity} < 999,999 REJECTED`)
        const res = await fetch(`${API_BASE}/inventory/${inventory[0].id}/reserve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity: 999999 })
        })
        const data = await res.json()
        await anim(['frontend', 'gateway'], ['frontend-gateway'], 'Error: Insufficient stock')
        return { success: res.status === 400, data }
      }
    },
    {
      id: 'persistence',
      name: 'Persistence Test',
      desc: 'Write data, read it back - proves durability',
      run: async (anim) => {
        const name = `PERSIST_${Date.now()}`
        await anim(['frontend'], [], `Testing persistence: ${name}`)
        await anim(['frontend', 'gateway'], ['frontend-gateway'], 'CREATE user')
        await anim(['gateway', 'users'], ['gateway-users'], 'Gateway -> Users')
        await anim(['users', 'postgres'], ['users-postgres'], 'INSERT INTO users')
        await anim(['postgres'], [], 'Data persisted to disk')
        const createRes = await fetch(`${API_BASE}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        })
        const created = await createRes.json()
        if (!createRes.ok) return { success: false, error: 'Create failed' }
        await anim(['frontend', 'gateway'], ['frontend-gateway'], 'READ user back')
        await anim(['gateway', 'users'], ['gateway-users'], 'Gateway -> Users')
        await anim(['users', 'postgres'], ['users-postgres'], `SELECT WHERE id=${created.id}`)
        const readRes = await fetch(`${API_BASE}/users/${created.id}`)
        const read = await readRes.json()
        await anim(['frontend'], [], read.name === name ? 'DATA MATCHES' : 'MISMATCH')
        return { success: read.name === name, data: { created, read } }
      }
    },
  ]

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr 380px',
      gap: '20px',
      height: '100%',
      padding: '4px',
    }}>
      {/* Left: Test Scenarios */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        background: 'linear-gradient(180deg, rgba(3, 5, 8, 0.98) 0%, rgba(8, 12, 18, 0.98) 100%)',
        border: '1px solid rgba(30, 40, 50, 0.8)',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        {/* Panel Header */}
        <div style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(30, 40, 50, 0.6)',
          background: 'rgba(10, 14, 20, 0.5)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', color: '#a855f7' }}>◇</span>
            <span style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: '10px',
              fontWeight: '600',
              letterSpacing: '0.15em',
              color: '#8892a0',
              textTransform: 'uppercase',
            }}>
              Test Scenarios
            </span>
          </div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '10px',
            fontWeight: '600',
            color: '#00ff9d',
            padding: '4px 10px',
            background: 'rgba(0, 255, 157, 0.1)',
            borderRadius: '4px',
            border: '1px solid rgba(0, 255, 157, 0.25)',
          }}>
            {tests.length} tests
          </div>
        </div>

        {/* Test Cards Container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '14px',
        }}>
          {tests.map(test => (
            <TestCard
              key={test.id}
              test={test}
              isRunning={running === test.id}
              isDisabled={running !== null && running !== test.id}
              result={results[test.id]}
              onRun={() => runTest(test)}
            />
          ))}
        </div>
      </div>

      {/* Center: Architecture Diagram */}
      <ArchitectureDiagram
        activeNodes={activeNodes}
        activeConnections={activeConnections}
        running={running}
        replayIndex={replayIndex}
        flowHistory={flowHistory}
      />

      {/* Right: Trace Log */}
      <TraceLog
        flowSteps={flowSteps}
        isComplete={isComplete}
        running={running}
        replayIndex={replayIndex}
        flowHistory={flowHistory}
        onGoToStep={goToStep}
        onPrev={prevStep}
        onNext={nextStep}
        onExitReplay={exitReplay}
      />
    </div>
  )
}

// Dashboard Component
function Dashboard({ health, users, inventory, orders }) {
  const totalStock = inventory.reduce((sum, i) => sum + (i.quantity || 0), 0)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { value: users.length, label: 'Users', color: '#00d4ff' },
          { value: inventory.length, label: 'Products', color: '#a855f7' },
          { value: totalStock, label: 'Total Stock', color: '#00ff9d' },
          { value: orders.length, label: 'Orders', color: '#ffb800' },
        ].map((stat, i) => (
          <div key={i} className="panel">
            <div className="panel-body" style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="panel">
          <div className="panel-header"><span className="panel-title">Service Health</span></div>
          <div className="panel-body" style={{ display: 'grid', gap: '8px' }}>
            {health?.services && Object.entries(health.services).map(([name, status]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#030508', border: '1px solid #1e2832' }}>
                <span style={{ fontFamily: "'Orbitron', monospace", fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{name}</span>
                <span className={`badge ${status === 'healthy' ? 'badge-success' : 'badge-danger'}`}>{status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-header"><span className="panel-title">Recent Orders</span></div>
          <div style={{ padding: 0 }}>
            <table>
              <thead><tr><th>Order ID</th><th>User</th><th>Status</th></tr></thead>
              <tbody>
                {orders.slice(0, 5).map(o => (
                  <tr key={o.id}>
                    <td className="text-cyan font-mono">{o.id}</td>
                    <td>{o.userId || o.UserId}</td>
                    <td><span className={`badge ${o.status === 'completed' ? 'badge-success' : o.status === 'pending' ? 'badge-warning' : 'badge-info'}`}>{o.status}</span></td>
                  </tr>
                ))}
                {orders.length === 0 && <tr><td colSpan={3} className="text-dim" style={{ textAlign: 'center' }}>No orders</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// Users CRUD Component
function Users({ users, refresh, notify }) {
  const [form, setForm] = useState({ name: '', email: '' })
  const [loading, setLoading] = useState(false)

  const create = async () => {
    if (!form.name) return notify('Name required', 'error')
    setLoading(true)
    const res = await fetch(`${API_BASE}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (res.ok) { notify(`User "${data.name}" created`); setForm({ name: '', email: '' }); refresh() }
    else notify(data.error || 'Failed', 'error')
    setLoading(false)
  }

  const del = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' })
    if (res.ok) { notify(`Deleted "${name}"`); refresh() }
    else notify('Delete failed', 'error')
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
      <div className="panel">
        <div className="panel-header"><span className="panel-title">User Registry</span><span className="text-dim font-mono">{users.length} records</span></div>
        <div style={{ padding: 0 }}>
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td className="text-cyan font-mono">{u.id}</td>
                  <td>{u.name}</td>
                  <td className="text-dim">{u.email}</td>
                  <td><button className="btn-danger btn-sm" onClick={() => del(u.id, u.name)}>DEL</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header"><span className="panel-title">Create User</span></div>
        <div className="panel-body" style={{ display: 'grid', gap: '14px' }}>
          <div><label>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Enter name" /></div>
          <div><label>Email</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" /></div>
          <button className="btn-primary" onClick={create} disabled={loading}>{loading ? 'CREATING...' : 'CREATE USER'}</button>
        </div>
      </div>
    </div>
  )
}

// Inventory CRUD Component
function Inventory({ inventory, refresh, notify }) {
  const [form, setForm] = useState({ id: '', name: '', quantity: 10, price: 9.99 })
  const [loading, setLoading] = useState(false)

  const create = async () => {
    if (!form.id || !form.name) return notify('ID and Name required', 'error')
    setLoading(true)
    const res = await fetch(`${API_BASE}/inventory`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data = await res.json()
    if (res.ok) { notify(`Item "${data.name}" created`); setForm({ id: '', name: '', quantity: 10, price: 9.99 }); refresh() }
    else notify(data.error || 'Failed', 'error')
    setLoading(false)
  }

  const restock = async (id, name) => {
    const qty = prompt(`Restock "${name}":`, '10')
    if (!qty) return
    const res = await fetch(`${API_BASE}/inventory/${id}/restock`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quantity: parseInt(qty) }) })
    if (res.ok) { notify(`Restocked ${qty} units`); refresh() }
    else notify('Restock failed', 'error')
  }

  const del = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    const res = await fetch(`${API_BASE}/inventory/${id}`, { method: 'DELETE' })
    if (res.ok) { notify(`Deleted "${name}"`); refresh() }
    else notify('Delete failed', 'error')
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
      <div className="panel">
        <div className="panel-header"><span className="panel-title">Inventory</span><span className="text-dim font-mono">{inventory.length} items</span></div>
        <div style={{ padding: 0 }}>
          <table>
            <thead><tr><th>SKU</th><th>Product</th><th>Stock</th><th>Price</th><th>Actions</th></tr></thead>
            <tbody>
              {inventory.map(i => (
                <tr key={i.id}>
                  <td className="text-amber font-mono">{i.id}</td>
                  <td>{i.name}</td>
                  <td style={{ color: i.quantity > 50 ? '#00ff9d' : i.quantity > 10 ? '#ffb800' : '#ff3b5c' }}>{i.quantity}</td>
                  <td className="text-dim">${i.price}</td>
                  <td style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn-sm" onClick={() => restock(i.id, i.name)}>+</button>
                    <button className="btn-danger btn-sm" onClick={() => del(i.id, i.name)}>DEL</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header"><span className="panel-title">Add Item</span></div>
        <div className="panel-body" style={{ display: 'grid', gap: '14px' }}>
          <div><label>SKU *</label><input value={form.id} onChange={e => setForm({ ...form, id: e.target.value.toUpperCase() })} placeholder="ITEM005" /></div>
          <div><label>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Product name" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div><label>Qty</label><input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} /></div>
            <div><label>Price</label><input type="number" step="0.01" value={form.price} onChange={e => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <button className="btn-primary" onClick={create} disabled={loading}>{loading ? 'CREATING...' : 'ADD ITEM'}</button>
        </div>
      </div>
    </div>
  )
}

// Orders CRUD Component
function Orders({ orders, users, inventory, refresh, notify }) {
  const [form, setForm] = useState({ userId: '', itemId: '', quantity: 1 })
  const [loading, setLoading] = useState(false)

  const create = async () => {
    if (!form.userId || !form.itemId) return notify('Select user and item', 'error')
    setLoading(true)
    const res = await fetch(`${API_BASE}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: form.userId, items: [{ item_id: form.itemId, quantity: parseInt(form.quantity) }] }) })
    const data = await res.json()
    if (res.ok) { notify(`Order ${data.id} created`); setForm({ userId: '', itemId: '', quantity: 1 }); refresh() }
    else notify(data.error || 'Failed', 'error')
    setLoading(false)
  }

  const del = async (id) => {
    if (!confirm(`Delete order ${id}?`)) return
    const res = await fetch(`${API_BASE}/orders/${id}`, { method: 'DELETE' })
    if (res.ok) { notify('Order deleted'); refresh() }
    else notify('Delete failed', 'error')
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px' }}>
      <div className="panel">
        <div className="panel-header"><span className="panel-title">Orders</span><span className="text-dim font-mono">{orders.length} orders</span></div>
        <div style={{ padding: 0 }}>
          <table>
            <thead><tr><th>Order</th><th>User</th><th>Items</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="text-amber font-mono">{o.id}</td>
                  <td>{users.find(u => u.id === (o.userId || o.UserId))?.name || o.userId}</td>
                  <td className="text-dim" style={{ fontSize: '11px' }}>{(o.items || o.Items)?.map(i => `${i.itemId || i.item_id}x${i.quantity}`).join(', ')}</td>
                  <td><span className={`badge ${o.status === 'completed' ? 'badge-success' : o.status === 'pending' ? 'badge-warning' : 'badge-info'}`}>{o.status}</span></td>
                  <td><button className="btn-danger btn-sm" onClick={() => del(o.id)}>DEL</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="panel">
        <div className="panel-header"><span className="panel-title">Create Order</span></div>
        <div className="panel-body" style={{ display: 'grid', gap: '14px' }}>
          <div><label>User *</label><select value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })}><option value="">Select user</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          <div><label>Item *</label><select value={form.itemId} onChange={e => setForm({ ...form, itemId: e.target.value })}><option value="">Select item</option>{inventory.map(i => <option key={i.id} value={i.id}>{i.name} (${i.price})</option>)}</select></div>
          <div><label>Quantity</label><input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></div>
          <button className="btn-primary" onClick={create} disabled={loading}>{loading ? 'PROCESSING...' : 'CREATE ORDER'}</button>
        </div>
      </div>
    </div>
  )
}
