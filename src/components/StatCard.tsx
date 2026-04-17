import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  name: string
  value: string | number
  icon: LucideIcon
  change?: string
  changeType?: 'increase' | 'decrease' | 'neutral'
}

export default function StatCard({ name, value, icon: Icon, change, changeType }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 transition-colors duration-300">
      <div className="flex items-center justify-between">
        <div className="p-2.5 bg-gray-50 rounded-xl">
          <Icon className="w-6 h-6 text-gray-700" />
        </div>
        {change && (
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
            changeType === 'increase' ? 'bg-green-50 text-green-600' : 
            changeType === 'decrease' ? 'bg-red-50 text-red-600' : 
            'bg-gray-50 text-gray-500'
          }`}>
            {change}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-500">{name}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  )
}
