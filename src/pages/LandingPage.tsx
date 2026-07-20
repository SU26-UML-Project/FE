import Hero from '../components/Landing/Hero'
import Features from '../components/Landing/Features'
import Templates from '../components/Landing/Templates'
import CTA from '../components/Landing/CTA'
import { useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import apiClient from '../services/apiClient'

const LandingPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  useEffect(() => {
    const orderCode = searchParams.get('orderCode')
    const status = searchParams.get('status')
    
    if (orderCode && status === 'PAID') {
      apiClient.get(`/payments/status/${orderCode}`).then(() => {
        toast.success('Thanh toán thành công! Gói cước của bạn đã được cập nhật.')
        navigate('/', { replace: true })
      }).catch(err => {
        console.error(err)
      })
    } else if (orderCode && status === 'CANCELLED') {
      apiClient.get(`/payments/status/${orderCode}`).then(() => {
        toast.error('Giao dịch đã bị huỷ.')
        navigate('/', { replace: true })
      }).catch(err => {
        console.error(err)
      })
    }
  }, [searchParams, navigate])

  return (
    <>
      <Hero />
      <Features />
      <Templates />
      <CTA />
    </>
  )
}

export default LandingPage
