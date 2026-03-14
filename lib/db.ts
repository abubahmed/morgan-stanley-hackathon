import { createClient } from './supabase/client'

const supabase = createClient()

// ---- CONVERSATIONS ----

export async function createConversation(userId: string, title: string) {
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getConversations(userId: string) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function deleteConversation(id: string) {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ---- MESSAGES ----

export async function saveMessage(
  conversationId: string,
  role: 'user' | 'assistant',
  content: string
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, role, content })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getMessages(conversationId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// ---- JOBS ----

export async function createJob(conversationId: string, userId: string, prompt: string) {
  const { data, error } = await supabase
    .from('jobs')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      prompt,
      status: 'pending'
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateJobStatus(
  jobId: string,
  status: 'pending' | 'running' | 'complete' | 'failed',
  result?: string
) {
  const { error } = await supabase
    .from('jobs')
    .update({
      status,
      result,
      completed_at: status === 'complete' || status === 'failed' 
        ? new Date().toISOString() 
        : null
    })
    .eq('id', jobId)
  if (error) throw error
}

export async function saveJobLog(
  jobId: string,
  iteration: number,
  code: string,
  stdout: string,
  stderr: string
) {
  const { error } = await supabase
    .from('job_logs')
    .insert({ job_id: jobId, iteration, code, stdout, stderr })
  if (error) throw error
}

export async function getJobWithLogs(jobId: string) {
  const { data, error } = await supabase
    .from('jobs')
    .select('*, job_logs(*)')
    .eq('id', jobId)
    .single()
  if (error) throw error
  return data
}
