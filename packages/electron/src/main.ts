import { app, BrowserWindow, shell, dialog, Menu } from 'electron'
import { initUpdater } from './updater.js'
import { createServer as createNetServer } from 'net'
import { networkInterfaces } from 'os'
import { pathToFileURL, fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function findFreePort(start = 3000): Promise<number> {
  return new Promise((resolve) => {
    const server = createNetServer()
    server.listen(start, () => {
      const addr = server.address() as { port: number }
      server.close(() => resolve(addr.port))
    })
    server.on('error', () => findFreePort(start + 1).then(resolve))
  })
}

function getLocalIp(): string | null {
  const nets = networkInterfaces()
  for (const ifaces of Object.values(nets)) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address
    }
  }
  return null
}

async function startProductionServer(): Promise<number> {
  const port = await findFreePort(3000)

  const clientDistDir = app.isPackaged
    ? path.join(process.resourcesPath, 'client-dist')
    : path.join(__dirname, '../../client/dist')

  const dataDir = path.join(app.getPath('userData'), 'data')

  process.env.NODE_ENV = 'production'
  process.env.PORT = String(port)
  process.env.DATA_DIR = dataDir
  process.env.CLIENT_DIST_DIR = clientDistDir

  const serverBundlePath = app.isPackaged
    ? path.join(process.resourcesPath, 'server-bundle.mjs')
    : path.join(__dirname, '../resources/server-bundle.mjs')

  const { createApp, startTunnel } = (await import(pathToFileURL(serverBundlePath).href)) as {
    createApp: () => {
      httpServer: import('http').Server
      setLocalUrl: (url: string) => void
      setTunnelUrl: (url: string) => void
    }
    startTunnel: (port: number) => Promise<string | null>
  }

  const { httpServer, setLocalUrl, setTunnelUrl } = createApp()

  const localIp = getLocalIp()
  if (localIp) setLocalUrl(`http://${localIp}:${port}`)

  await new Promise<void>((resolve, reject) => {
    httpServer.listen(port, resolve)
    httpServer.once('error', reject)
  })

  // Inicia tunnel em background — não bloqueia abertura da janela
  startTunnel(port).then((tunnelUrl) => {
    if (tunnelUrl) setTunnelUrl(tunnelUrl)
  }).catch(() => { /* tunnel opcional, falha silenciosa */ })

  return port
}

async function createWindow(): Promise<void> {
  // Expõe o locale do sistema para o renderer detectar via navigator.language override
  const systemLocale = app.getLocale()

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'buzze.io',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      additionalArguments: [`--app-locale=${systemLocale}`],
    },
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (app.isPackaged) {
    const port = await startProductionServer()
    await win.loadURL(`http://localhost:${port}`)
  } else {
    await win.loadURL('http://localhost:5173')
  }
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  createWindow().catch((err: Error) => {
    dialog.showErrorBox('Falha ao iniciar', err.message)
    app.quit()
  })
  initUpdater()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
