import { useEffect } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { useAuthStore } from '../../stores/useAuthStore'
import { authService } from '../../services/authService'
import { setAuthCookie, COOKIE_KEYS } from '../../shared/lib/auth'

const OAuth2Handler = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)

  useEffect(() => {
    const loginStatus = searchParams.get('login')
    const errorMsg = searchParams.get('error')

    const handleOAuth2Success = async (accessToken: string, refreshToken: string) => {
      try {
        setAuthCookie(COOKIE_KEYS.ACCESS_TOKEN, accessToken);
        setAuthCookie(COOKIE_KEYS.REFRESH_TOKEN, refreshToken);
        const userResponse = await authService.getCurrentUser();
        setAuth(userResponse.result);
        toast.success('Đăng nhập Google thành công!')
        if (userResponse.result?.profileCompleted === false) {
          navigate('/onboarding', { replace: true })
        } else {
          navigate('/dashboard', { replace: true })
        }
      } catch (error) {
        console.error('OAuth2 User Info Error:', error);
        toast.error('Không thể lấy thông tin người dùng sau khi đăng nhập Google');
        navigate('/', { replace: true });
      }
    };

    if (loginStatus === 'success') {
      const accessToken = searchParams.get('access_token')
      const refreshToken = searchParams.get('refresh_token')
      if (accessToken && refreshToken) handleOAuth2Success(accessToken, refreshToken);
    }
    if (errorMsg) {
      toast.error(decodeURIComponent(errorMsg))
      navigate('/', { replace: true })
    }
  }, [searchParams, navigate, setAuth])

  return null
}

export default OAuth2Handler
