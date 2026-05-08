import PocketBase from 'pocketbase'

const pb = new PocketBase(
  import.meta.env.VITE_POCKETBASE_URL || 'https://flowdesk-9662b.shrd00.internal.goskip.dev',
)
pb.autoCancellation(false)

export default pb
