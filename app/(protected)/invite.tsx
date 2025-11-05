import { useOrgInvites } from '@/hooks/useOrgInvites'
import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'

export default function InviteScreen() {
  const { token } = useLocalSearchParams<{ token: string }>()
  const { acceptInvite } = useOrgInvites()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (token) {
      handleAccept()
    }
  }, [token])

  const handleAccept = async () => {
    try {
      const result = await acceptInvite(token)
      setStatus('success')
      setMessage(`You've joined ${result.org_name}!`)
      setTimeout(() => {
        router.replace('/(protected)/(tabs)')
      }, 2000)
    } catch (error: any) {
      setStatus('error')
      setMessage(error.message || 'Failed to join organization')
    }
  }

  return (
    <View style={styles.container}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" />
          <Text style={styles.text}>Joining organization...</Text>
        </>
      )}
      {status === 'success' && (
        <Text style={styles.success}>{message}</Text>
      )}
      {status === 'error' && (
        <Text style={styles.error}>{message}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  text: { marginTop: 16, fontSize: 16 },
  success: { fontSize: 18, color: 'green', textAlign: 'center' },
  error: { fontSize: 18, color: 'red', textAlign: 'center' },
})