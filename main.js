'use strict';

const {app, Menu, dialog, shell, BrowserWindow} = require('electron');

const ipcMain = require('electron').ipcMain;

const ipc = app.ipcMain;
const fs = require('fs')
const os = require('os')
const path = require('path')

const mainPage = 'file://' + __dirname + '/index.html';

const tray = require('./tray');
const Config = require('./package.json');
var localShortcut = require('electron-localshortcut');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let isQuitting = false;

var createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 1400, height: 800, icon: __dirname+'/img/favicon.ico'});

  // and load the index.html of the app.
  mainWindow.loadURL(mainPage);

  // Open the DevTools.
  //mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });

  mainWindow.on('close', e => {
    if (!isQuitting) {
      e.preventDefault();
      if (process.platform === 'darwin') {
        app.hide();
      } else {
        mainWindow.hide();
      }
    }
  });

  //Open anchor links in browser
  mainWindow.webContents.on('will-navigate', (e, url) => {
    e.preventDefault();
    shell.openExternal(url);
  });

  //Set native menubar
  var template = [
    {
      label: "&File",
      submenu: [
        {label: "New", accelerator: "CmdOrCtrl+N", click: () => {
          var focusedWindow = BrowserWindow.getFocusedWindow();
          focusedWindow.webContents.send('file-new');
        }},
        {label: "Open", accelerator: "CmdOrCtrl+O", click: () => {
          let focusedWindow = BrowserWindow.getFocusedWindow();
          focusedWindow.webContents.send('file-open');
        }},
        {label: "Save", accelerator: "CmdOrCtrl+S", click: () => {
          let focusedWindow = BrowserWindow.getFocusedWindow();
          focusedWindow.webContents.send('file-save');
        }},
        {label: "Save As", accelerator: "CmdOrCtrl+Shift+S", click: () => {
          var focusedWindow = BrowserWindow.getFocusedWindow();
          focusedWindow.webContents.send('file-save-as');
        }},
        {label: "Save As PDF", accelerator: "CmdOrCtrl+Shift+P", click: () => {
          focusedWindow.webContents.send('file-pdf');
        }},
        {label: "Quit", accelerator: "Command+Q", click: app.quit}
      ]
    },
    {
      label: "&Edit",
      submenu: [
        {label: "Undo", accelerator: "CmdOrCtrl+Z", role: "undo"},
        {label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", role: "redo"},
        {type: "separator"},
        {label: "Cut", accelerator: "CmdOrCtrl+X", role: "cut"},
        {label: "Copy", accelerator: "CmdOrCtrl+C", role: "copy"},
        {label: "Paste", accelerator: "CmdOrCtrl+V", role: "paste"},
        {label: "Select All", accelerator: "CmdOrCtrl+A", role: 'selectall'},
        {type: "separator"},
        {label: "Search", accelerator: "CmdOrCtrl+F", click: () => {
          let focusedWindow = BrowserWindow.getFocusedWindow();
          focusedWindow.webContents.send('ctrl+f');
        }},
        {label: "Replace", accelerator: "CmdOrCtrl+Shift+F", click: () => {
          let focusedWindow = BrowserWindow.getFocusedWindow();
          focusedWindow.webContents.send('ctrl+shift+f');
        }}
      ]
    },
    {
      label: "&View",
      submenu: [
        {label: "Toggle Full Screen", accelerator:"F11", click: () => {
          let focusedWindow = BrowserWindow.getFocusedWindow();
          let isFullScreen = focusedWindow.isFullScreen();
          focusedWindow.setFullScreen(!isFullScreen);
        }}
      ]
    },
    {
      label: "&Help",
      submenu: [
        {label: "Documentation", click:  () => {
          shell.openExternal(Config.repository.docs);
        }},
        {label: "Report Issue", click: () => {
          shell.openExternal(Config.bugs.url);
        }},
        {label: "About Markdownify", click: () => {
          dialog.showMessageBox({title: "About Markdownify", type:"info", message: "A minimal Markdown Editor desktop app. \nMIT Copyright (c) 2016 Amit Merchant <bullredeyes@gmail.com>", buttons: ["Close"] });
        }}
      ]
    }
  ];

  ipcMain.on('print-to-pdf', (event, filePath) => {

    const win = BrowserWindow.fromWebContents(event.sender)
    // Use default printing options
    win.webContents.printToPDF({pageSize: 'A4'}, (error, data) => {
      if (error) throw error
      fs.writeFile(filePath, data, (error) => {
        if (error) {
          throw error
        }
      })
    })

  });

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // Registering shortcuts for formatting markdown
  var focusedWindow = BrowserWindow.getFocusedWindow();
  localShortcut.register('CmdOrCtrl+b', () => {
      focusedWindow.webContents.send('ctrl+b');
  });

  localShortcut.register('CmdOrCtrl+i', () => {
      focusedWindow.webContents.send('ctrl+i');
  });

  localShortcut.register('CmdOrCtrl+/', () => {
      focusedWindow.webContents.send('ctrl+/');
  });

  localShortcut.register('CmdOrCtrl+l', () => {
      focusedWindow.webContents.send('ctrl+l');
  });

  localShortcut.register('CmdOrCtrl+h', () => {
      focusedWindow.webContents.send('ctrl+h');
  });

  localShortcut.register('CmdOrCtrl+Alt+i', () => {
      focusedWindow.webContents.send('ctrl+alt+i');
  });

  localShortcut.register('CmdOrCtrl+Shift+t', () => {
      focusedWindow.webContents.send('ctrl+shift+t');
  });

  tray.create(mainWindow);
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});
