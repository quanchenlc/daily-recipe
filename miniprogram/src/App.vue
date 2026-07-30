<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app'
import { useAuth } from './composables/useAuth'

const { ensureLogin } = useAuth()

onLaunch(() => {
  void ensureLogin().catch(() => {
    uni.showToast({ title: '登录失败，请稍后重试', icon: 'none' })
  })
})
</script>

<style>
page {
  background: #f6f8f4;
  color: #1a1a1a;
  font-size: 28rpx;
}
</style>
