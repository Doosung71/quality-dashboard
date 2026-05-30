import { signOut } from "@/auth"

export default function PendingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm space-y-6">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">⏳</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-lg font-bold text-slate-800">승인 대기 중</h1>
          <p className="text-sm text-slate-500">
            가입 신청이 접수되었습니다.<br />
            관리자 승인 후 로그인할 수 있습니다.
          </p>
          <p className="text-xs text-slate-400">문의: doosung71@gmail.com</p>
        </div>

        <div className="space-y-2">
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button
              type="submit"
              className="w-full bg-slate-950 hover:bg-slate-800 text-white text-sm font-bold py-2.5 px-4 rounded-xl transition-colors"
            >
              로그인 페이지로 돌아가기
            </button>
          </form>
          <p className="text-[11px] text-slate-400">
            관리자 계정으로 로그인하려면 위 버튼을 사용하세요.
          </p>
        </div>
      </div>
    </div>
  )
}
