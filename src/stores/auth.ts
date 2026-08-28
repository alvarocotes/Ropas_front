import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import api from '@/api/client'
import type { User } from '@/types'

const TOKEN_KEY = 'abrigar_token'
const USER_KEY = 'abrigar_user'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<User | null>(readStoredUser())

  const isAuthenticated = computed(() => Boolean(token.value))
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isReception = computed(() => user.value?.role === 'reception')
  const canHandleInventory = computed(
    () => user.value?.role === 'admin' || user.value?.role === 'volunteer',
  )

  function persist(nextToken: string, nextUser: User) {
    token.value = nextToken
    user.value = nextUser
    localStorage.setItem(TOKEN_KEY, nextToken)
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser))
  }

  async function login(email: string, password: string) {
    const { data } = await api.post<{ accessToken: string; user: User }>('/auth/login', {
      email,
      password,
    })
    persist(data.accessToken, data.user)
  }

  async function fetchMe() {
    if (!token.value) return
    const { data } = await api.get<User>('/auth/me')
    user.value = data
    localStorage.setItem(USER_KEY, JSON.stringify(data))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    isReception,
    canHandleInventory,
    login,
    fetchMe,
    logout,
  }
})

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}
