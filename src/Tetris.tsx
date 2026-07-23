import { useState, useEffect, useCallback, useRef } from 'react'

// Tetris game constants
const ROWS = 20
const COLS = 10
const CELL_SIZE = 28

// Tetromino shapes
const SHAPES: Record<string, number[][]> = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]],
}

const COLORS: Record<string, string> = {
  I: '#06B6D4', O: '#F59E0B', T: '#8B5CF6',
  S: '#10B981', Z: '#EF4444', J: '#3B82F6', L: '#F97316',
}

type Piece = { shape: number[][]; type: string; x: number; y: number }

function createPiece(): Piece {
  const types = Object.keys(SHAPES)
  const type = types[Math.floor(Math.random() * types.length)]
  const shape = SHAPES[type].map(r => [...r])
  return { shape, type, x: Math.floor((COLS - shape[0].length) / 2), y: 0 }
}

export default function Tetris() {
  const [board, setBoard] = useState<number[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  )
  const [colorBoard, setColorBoard] = useState<string[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(''))
  )
  const [piece, setPiece] = useState<Piece | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [paused, setPaused] = useState(false)
  const [score, setScore] = useState(0)
  const [lines, setLines] = useState(0)
  const pieceRef = useRef<Piece | null>(null)
  const boardRef = useRef(board)
  const colorRef = useRef(colorBoard)
  const gameOverRef = useRef(false)
  const pausedRef = useRef(false)
  const speedRef = useRef(800)
  const mountedRef = useRef(true)
  // Track which speed keys are currently held
  const speedKeysRef = useRef<Set<string>>(new Set())

  // Keep refs in sync
  useEffect(() => { boardRef.current = board }, [board])
  useEffect(() => { colorRef.current = colorBoard }, [colorBoard])
  useEffect(() => { pausedRef.current = paused }, [paused])
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  function collides(shape: number[][], x: number, y: number, b: number[][]): boolean {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue
        const nx = x + c, ny = y + r
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true
        if (ny < 0) continue
        if (b[ny][nx]) return true
      }
    }
    return false
  }

  function mergePiece() {
    const p = pieceRef.current
    if (!p) return
    const newBoard = boardRef.current.map(r => [...r])
    const newColors = colorRef.current.map(r => [...r])
    for (let r = 0; r < p.shape.length; r++) {
      for (let c = 0; c < p.shape[r].length; c++) {
        if (!p.shape[r][c]) continue
        const ny = p.y + r, nx = p.x + c
        if (ny < 0) { if (mountedRef.current) { setGameOver(true); gameOverRef.current = true } return }
        newBoard[ny][nx] = 1
        newColors[ny][nx] = COLORS[p.type]
      }
    }
    // Set state first, then clear lines
    setBoard(newBoard)
    setColorBoard(newColors)
    clearLines(newBoard, newColors)
  }

  function clearLines(b: number[][], clr: string[][]) {
    let cleared = 0
    const newBoard = b.filter(row => {
      const full = row.every(c => c)
      if (full) cleared++
      return !full
    })
    const newColors = clr.filter((_, i) => !b[i].every(c => c))
    while (newBoard.length < ROWS) {
      newBoard.unshift(Array(COLS).fill(0))
      newColors.unshift(Array(COLS).fill(''))
    }
    setBoard(newBoard)
    setColorBoard(newColors)
    // Sync refs immediately so spawnPiece below reads fresh board
    boardRef.current = newBoard
    colorRef.current = newColors
    if (cleared > 0) {
      setLines(l => l + cleared)
      setScore(s => s + [0, 100, 300, 500, 800][Math.min(cleared, 4)])
    }
  }

  function drop() {
    if (gameOverRef.current || !pieceRef.current || pausedRef.current) return
    const p = pieceRef.current
    if (!collides(p.shape, p.x, p.y + 1, boardRef.current)) {
      const newPiece = { ...p, y: p.y + 1 }
      setPiece(newPiece)
      pieceRef.current = newPiece
    } else {
      mergePiece()
      spawnPiece()
    }
  }

  function spawnPiece() {
    if (gameOverRef.current) return
    const p = createPiece()
    if (collides(p.shape, p.x, p.y, boardRef.current)) {
      if (mountedRef.current) { setGameOver(true); gameOverRef.current = true }
      return
    }
    setPiece(p)
    pieceRef.current = p
  }

  function movePiece(dx: number, dy: number) {
    if (gameOverRef.current || !pieceRef.current || pausedRef.current) return
    const p = pieceRef.current
    if (!collides(p.shape, p.x + dx, p.y + dy, boardRef.current)) {
      const newPiece = { ...p, x: p.x + dx, y: p.y + dy }
      setPiece(newPiece)
      pieceRef.current = newPiece
    }
  }

  function rotatePiece() {
    if (gameOverRef.current || !pieceRef.current || pausedRef.current) return
    const p = pieceRef.current
    const n = p.shape.length
    const rotated = Array.from({ length: n }, (_, r) =>
      Array.from({ length: n }, (_, c) => p.shape[n - 1 - c][r])
    )
    // Kickback: try dx offsets 0, ±1, ±2
    for (let dx = 0; dx <= 2; dx++) {
      for (const sign of [1, -1]) {
        const testX = p.x + sign * dx
        if (!collides(rotated, testX, p.y, boardRef.current)) {
          const np = { ...p, shape: rotated, x: testX }
          setPiece(np)
          pieceRef.current = np
          return
        }
      }
    }
  }

  function reset() {
    const b = Array.from({ length: ROWS }, () => Array(COLS).fill(0))
    const cl = Array.from({ length: ROWS }, () => Array(COLS).fill(''))
    setBoard(b)
    setColorBoard(cl)
    boardRef.current = b
    colorRef.current = cl
    setGameOver(false)
    gameOverRef.current = false
    setScore(0)
    setLines(0)
    setPaused(false)
    pausedRef.current = false
    speedRef.current = 800
    speedKeysRef.current.clear()
    const p = createPiece()
    setPiece(p)
    pieceRef.current = p
  }

  // Init game
  useEffect(() => {
    reset()
  }, [])

  // Game loop with dynamic speed
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function tick() {
      if (!paused) drop()
      timer = setTimeout(tick, speedRef.current)
    }
    tick()
    return () => clearTimeout(timer)
  }, [paused])

  // Keyboard controls
  function speedDown(e: KeyboardEvent) {
    const key = e.key
    if (key === 'ArrowDown' || key === ' ') {
      e.preventDefault()
      speedKeysRef.current.add(key)
      // Immediately move piece one row down
      if (key === 'ArrowDown') movePiece(0, 1)
      // Set accelerated speed
      speedRef.current = key === ' ' ? 30 : 50
    }
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft': e.preventDefault(); movePiece(-1, 0); break
      case 'ArrowRight': e.preventDefault(); movePiece(1, 0); break
      case 'ArrowDown': speedDown(e); break
      case 'ArrowUp': e.preventDefault(); rotatePiece(); break
      case ' ': speedDown(e); break
      case 'p': case 'P': setPaused(p => !p); break
      case 'r': case 'R': if (gameOverRef.current) reset(); break
    }
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === ' ') {
      e.preventDefault()
      speedKeysRef.current.delete(e.key)
      // Only reset speed when ALL speed keys are released
      if (speedKeysRef.current.size === 0) {
        speedRef.current = 800
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])

  // Render board — reads from state (not refs) to avoid visual glitches
  function getDisplayBoard() {
    const display = board.map((row, r) =>
      row.map((cell, c) => ({ filled: cell, color: colorBoard[r][c] }))
    )
    if (piece && !gameOver) {
      for (let r = 0; r < piece.shape.length; r++) {
        for (let c = 0; c < piece.shape[r].length; c++) {
          if (!piece.shape[r][c]) continue
          const ny = piece.y + r, nx = piece.x + c
          if (ny >= 0 && ny < ROWS && nx >= 0 && nx < COLS) {
            display[ny][nx] = { filled: true, color: COLORS[piece.type] }
          }
        }
      }
    }
    return display
  }

  const display = getDisplayBoard()

  return (
    <div className="tetris-container">
      <div className="tetris-info">
        <div className="tetris-stat">
          <span className="tetris-stat-label">分数</span>
          <span className="tetris-stat-value">{score}</span>
        </div>
        <div className="tetris-stat">
          <span className="tetris-stat-label">行数</span>
          <span className="tetris-stat-value">{lines}</span>
        </div>
      </div>

      <div className="tetris-board-wrapper">
        <div className="tetris-board" style={{
          width: COLS * CELL_SIZE + 2,
          height: ROWS * CELL_SIZE + 2,
        }}>
          {display.flatMap((row, r) =>
            row.map((cell, c) => (
              <div key={`${r}-${c}`} className={`tetris-cell ${cell.filled ? 'filled' : ''}`}
                style={{
                  width: CELL_SIZE, height: CELL_SIZE,
                  left: c * CELL_SIZE + 1, top: r * CELL_SIZE + 1,
                  backgroundColor: cell.filled ? (cell.color || '#6B7280') : 'transparent',
                }}
              />
            ))
          )}
        </div>
      </div>

      {gameOver && (
        <div className="tetris-overlay">
          <div className="tetris-overlay-text">
            <h2>游戏结束</h2>
            <p>得分: {score}</p>
            <button className="btn-primary" onClick={reset} style={{ marginTop: 12, width: 'auto', padding: '10px 30px' }}>
              重新开始
            </button>
          </div>
        </div>
      )}

      {paused && !gameOver && (
        <div className="tetris-overlay">
          <div className="tetris-overlay-text">
            <h2>暂停中</h2>
            <p>按 P 继续</p>
          </div>
        </div>
      )}

      <div className="tetris-controls-hint">
        <span>← → 移动</span>
        <span>↑ 旋转</span>
        <span>↓ 加速下落</span>
        <span>空格 极速下落</span>
        <span>P 暂停</span>
      </div>
    </div>
  )
}
