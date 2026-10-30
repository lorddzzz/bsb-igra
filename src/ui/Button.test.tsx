// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { Button } from './components'

afterEach(cleanup)

it('explains a rejected action and lets the player retry after failure', async () => {
  const action = vi.fn().mockRejectedValueOnce(new Error('permission denied')).mockResolvedValueOnce(true)
  render(<Button onClick={action}>Pošalji</Button>)
  fireEvent.click(screen.getByRole('button'))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Potez nije uspeo. Proveri vezu i probaj ponovo.')
  expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(false)
  fireEvent.click(screen.getByRole('button'))
  await waitFor(() => expect(action).toHaveBeenCalledTimes(2))
  expect(screen.queryByRole('alert')).toBeNull()
})
