import { NextResponse } from 'next/server'

export function middleware(request) {
  // 处理图片优化API的响应头
  if (request.nextUrl.pathname.startsWith('/_next/image')) {
    const response = NextResponse.next()
    
    // 设置Content-Disposition为inline以在浏览器中显示而不是下载
    response.headers.set('Content-Disposition', 'inline')
    
    return response
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/_next/image/:path*',
  ]
}