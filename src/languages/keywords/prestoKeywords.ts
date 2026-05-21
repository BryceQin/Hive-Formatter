import type { KeywordInfo } from '../../hover/HoverResolver'

export const prestoKeywords: KeywordInfo[] = [
    { keyword: 'CROSS JOIN UNNEST', syntax: 'FROM table CROSS JOIN UNNEST(array_col) AS t(alias)', description: '将数组展开为多行', category: 'hint', example: 'SELECT id, val\nFROM src\nCROSS JOIN UNNEST(array_col) AS t(val)' },
    { keyword: 'LATERAL', syntax: 'FROM table, LATERAL (subquery)', description: '关联子查询，引用外部表的列', category: 'hint' },
    { keyword: 'UNNEST', syntax: 'UNNEST(array_or_map) [WITH ORDINALITY]', description: '将数组或 Map 展开为关系', category: 'hint', example: 'SELECT * FROM UNNEST(ARRAY[1, 2, 3]) AS t(x)' },
    { keyword: 'WITH ORDINALITY', syntax: 'UNNEST(...) WITH ORDINALITY', description: '在 UNNEST 结果中附加行序号列', category: 'hint', example: 'SELECT * FROM UNNEST(ARRAY[\'a\', \'b\']) WITH ORDINALITY AS t(val, ord)' },
]
