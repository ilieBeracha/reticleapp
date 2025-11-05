import { supabase } from '@/lib/supabase'
import * as Clipboard from 'expo-clipboard'
import * as Sharing from 'expo-sharing'
import { useState } from 'react'
import { Alert } from 'react-native'

export function useOrgInvites() {
  const [loading, setLoading] = useState(false)

  const createInvite = async (
    orgId: string, 
    role: 'commander' | 'member' | 'viewer' = 'member'
  ) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('create_org_invite', {
        p_org_id: orgId,
        p_role: role,
      })
      
      if (error) throw error
      return data[0]
    } finally {
      setLoading(false)
    }
  }

  const shareInvite = async (inviteLink: string, orgName: string) => {
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(inviteLink, {
          dialogTitle: `Join ${orgName} on Reticle`,
        })
      } else {
        await Clipboard.setStringAsync(inviteLink)
        Alert.alert('Link Copied', 'Invite link copied to clipboard!')
      }
    } catch (error) {
      console.error('Share error:', error)
    }
  }

  const acceptInvite = async (token: string) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('accept_org_invite', {
        p_token: token,
      })
      
      if (error) throw error
      return data
    } finally {
      setLoading(false)
    }
  }

  return { createInvite, shareInvite, acceptInvite, loading }
}