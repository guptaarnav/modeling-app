import { test, expect } from '@playwright/test'
import * as fsp from 'fs/promises'
import { getUtils, setup, setupElectron, tearDown } from './test-utils'

test.beforeEach(async ({ context, page }) => {
  await setup(context, page)
})

test.afterEach(async ({ page }, testInfo) => {
  await tearDown(page, testInfo)
})

test.describe('when using the file tree to', () => {
  const fromFile = 'main.kcl'
  const toFile = 'hello.kcl'

  test(
    `rename ${fromFile} to ${toFile}, and doesn't crash on reload and settings load`,
    { tag: '@electron' },
    async ({ browser: _ }, testInfo) => {
      const { electronApp, page } = await setupElectron({
        testInfo,
        folderSetupFn: async () => {},
      })

      const {
        panesOpen,
        createAndSelectProject,
        pasteCodeInEditor,
        renameFile,
        editorTextMatches,
      } = await getUtils(page, test)

      await page.setViewportSize({ width: 1200, height: 500 })
      page.on('console', console.log)

      await panesOpen(['files', 'code'])

      await createAndSelectProject('project-000')

      // File the main.kcl with contents
      const kclCube = await fsp.readFile(
        'src/wasm-lib/tests/executor/inputs/cube.kcl',
        'utf-8'
      )
      await pasteCodeInEditor(kclCube)

      await renameFile(fromFile, toFile)
      await page.reload()

      await test.step('Postcondition: editor has same content as before the rename', async () => {
        await editorTextMatches(kclCube)
      })

      await test.step('Postcondition: opening and closing settings works', async () => {
        const settingsOpenButton = page.getByRole('link', {
          name: 'settings Settings',
        })
        const settingsCloseButton = page.getByTestId('settings-close-button')
        await settingsOpenButton.click()
        await settingsCloseButton.click()
      })

      await electronApp.close()
    }
  )

  test(
    `create many new untitled files they increment their names`,
    { tag: '@electron' },
    async ({ browser: _ }, testInfo) => {
      const { electronApp, page } = await setupElectron({
        testInfo,
        folderSetupFn: async () => {},
      })

      const { panesOpen, createAndSelectProject, createNewFile } =
        await getUtils(page, test)

      await page.setViewportSize({ width: 1200, height: 500 })
      page.on('console', console.log)

      await panesOpen(['files'])

      await createAndSelectProject('project-000')

      await createNewFile('')
      await createNewFile('')
      await createNewFile('')
      await createNewFile('')
      await createNewFile('')

      await test.step('Postcondition: there are 5 new Untitled-*.kcl files', async () => {
        await expect(
          page
            .locator('[data-testid="file-pane-scroll-container"] button')
            .filter({ hasText: /Untitled[-]?[0-5]?/ })
        ).toHaveCount(5)
      })

      await electronApp.close()
    }
  )

  test(
    'create a new file with the same name as an existing file cancels the operation',
    { tag: '@electron' },
    async ({ browser: _ }, testInfo) => {
      const { electronApp, page } = await setupElectron({
        testInfo,
        folderSetupFn: async () => {},
      })

      const {
        panesOpen,
        createAndSelectProject,
        pasteCodeInEditor,
        createNewFileAndSelect,
        renameFile,
        selectFile,
        editorTextMatches,
      } = await getUtils(page, test)

      await page.setViewportSize({ width: 1200, height: 500 })
      page.on('console', console.log)

      await panesOpen(['files', 'code'])

      await createAndSelectProject('project-000')
      // File the main.kcl with contents
      const kclCube = await fsp.readFile(
        'src/wasm-lib/tests/executor/inputs/cube.kcl',
        'utf-8'
      )
      await pasteCodeInEditor(kclCube)

      const kcl1 = 'main.kcl'
      const kcl2 = '2.kcl'

      await createNewFileAndSelect(kcl2)
      const kclCylinder = await fsp.readFile(
        'src/wasm-lib/tests/executor/inputs/cylinder.kcl',
        'utf-8'
      )
      await pasteCodeInEditor(kclCylinder)

      await renameFile(kcl2, kcl1)

      await test.step(`Postcondition: ${kcl1} still has the original content`, async () => {
        await selectFile(kcl1)
        await editorTextMatches(kclCube)
      })

      await test.step(`Postcondition: ${kcl2} still exists with the original content`, async () => {
        await selectFile(kcl2)
        await editorTextMatches(kclCylinder)
      })

      await electronApp.close()
    }
  )

  test(
    'deleting all files recreates a default main.kcl with no code',
    { tag: '@electron' },
    async ({ browser: _ }, testInfo) => {
      const { electronApp, page } = await setupElectron({
        testInfo,
        folderSetupFn: async () => {},
      })

      const {
        panesOpen,
        createAndSelectProject,
        pasteCodeInEditor,
        deleteFile,
        editorTextMatches,
      } = await getUtils(page, test)

      await page.setViewportSize({ width: 1200, height: 500 })
      page.on('console', console.log)

      await panesOpen(['files', 'code'])

      await createAndSelectProject('project-000')
      // File the main.kcl with contents
      const kclCube = await fsp.readFile(
        'src/wasm-lib/tests/executor/inputs/cube.kcl',
        'utf-8'
      )
      await pasteCodeInEditor(kclCube)

      const kcl1 = 'main.kcl'

      await deleteFile(kcl1)

      await test.step(`Postcondition: ${kcl1} is recreated but has no content`, async () => {
        await editorTextMatches('')
      })

      await electronApp.close()
    }
  )
})