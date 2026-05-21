export interface FunctionSignature {
    name: string
    params: string[]
    returnType?: string
    description: string
    category: FunctionCategory
}

export type FunctionCategory =
    | 'string' | 'math' | 'date' | 'aggregate' | 'conditional'
    | 'window' | 'collection' | 'json' | 'type-conversion'
    | 'encryption' | 'table' | 'other'
    | 'character' | 'conversion' | 'numeric' | 'analytical' | 'xml' | 'system' | 'array' | 'geometric'
    | 'map' | 'bitwise' | 'url' | 'ip'

export function signatureToString(fn: FunctionSignature): string {
    return `${fn.name}(${fn.params.join(', ')})`
}

export function getCategoryLabel(category: FunctionCategory): string {
    const labels: Record<FunctionCategory, string> = {
        'string': '字符串', 'math': '数学', 'date': '日期',
        'aggregate': '聚合', 'conditional': '条件', 'window': '窗口',
        'collection': '集合', 'json': 'JSON', 'type-conversion': '类型转换',
        'encryption': '加密/哈希', 'table': '表生成', 'other': '其他',
        'system': '系统', 'array': '数组', 'geometric': '几何',
        'map': '映射', 'bitwise': '位运算', 'url': 'URL', 'ip': 'IP',
        'character': '字符', 'conversion': '转换', 'numeric': '数值',
        'analytical': '分析', 'xml': 'XML',
    }
    return labels[category]
}