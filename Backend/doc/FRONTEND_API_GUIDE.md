# 前端接口和交互逻辑说明文档

## 📋 概述

本文档说明信件提交、状态轮询和失败重试的完整交互流程。后端已实现自动重试机制（最多3次），前端需要处理失败后的用户重试流程。

**⚠️ 重要提示**: 对于所有需要用户填写和选择的内容（Current Profile、Future Profile、写信、聊天），**前端必须在提交前进行验证**，不符合 schema 时要弹窗提示用户，而不是让后端处理这些验证错误。

---

## ✅ 前端数据验证（重要！）

### 为什么需要前端验证？

1. **用户体验**: 立即反馈错误，用户无需等待网络请求
2. **减少服务器负载**: 避免无效请求到达后端
3. **数据质量**: 确保提交的数据符合 schema 要求
4. **避免后端错误**: 防止因数据格式错误导致的 400 错误

### ⚠️ 验证原则

**所有用户填写/选择的内容必须在提交前进行前端验证，不符合规则时弹窗提示用户，不允许提交。**

---

## 📝 各模块验证规则

### 1. Current Profile (F2.1) - 当前档案

**接口**: `POST /api/v1/profile/current`

#### 验证规则

**demo_data (基本信息)**
```javascript
{
  name: string,        // 必填，1-50字符
  age: number,         // 必填，18-100之间的整数
  gender: string,      // 必填，至少1字符
  status: string,      // 必填，至少1字符
  field: string,       // 必填，至少1字符
  interests: string,   // 必填，至少1字符
  location: string,    // 必填，至少1字符
  future_location: string  // 必填，至少1字符
}
```

**vals_data (价值观问卷)**
```javascript
// 对象，所有值必须是 1.0-5.0 之间的浮点数
// 示例: { "value1": 3.5, "value2": 4.0, ... }
// 验证: Object.values(vals_data).every(v => v >= 1.0 && v <= 5.0)
```

**bfi_data (人格特质问卷)**
```javascript
// 对象，所有值必须是 1.0-5.0 之间的浮点数
// 示例: { "trait1": 2.5, "trait2": 4.5, ... }
// 验证: Object.values(bfi_data).every(v => v >= 1.0 && v <= 5.0)
```

#### 前端验证示例

```javascript
function validateCurrentProfile(data) {
  const errors = [];
  
  // 验证 demo_data
  if (!data.demo_data.name || data.demo_data.name.length < 1 || data.demo_data.name.length > 50) {
    errors.push('姓名必须在1-50字符之间');
  }
  
  if (!data.demo_data.age || data.demo_data.age < 18 || data.demo_data.age > 100) {
    errors.push('年龄必须在18-100之间');
  }
  
  // 验证其他必填字段
  const requiredFields = ['gender', 'status', 'field', 'interests', 'location', 'future_location'];
  for (const field of requiredFields) {
    if (!data.demo_data[field] || data.demo_data[field].length < 1) {
      errors.push(`${getFieldLabel(field)}不能为空`);
    }
  }
  
  // 验证 vals_data
  if (!data.vals_data || Object.keys(data.vals_data).length === 0) {
    errors.push('价值观问卷必须填写');
  } else {
    const invalidValues = Object.values(data.vals_data).filter(v => v < 1.0 || v > 5.0);
    if (invalidValues.length > 0) {
      errors.push('价值观问卷的评分必须在1.0-5.0之间');
    }
  }
  
  // 验证 bfi_data
  if (!data.bfi_data || Object.keys(data.bfi_data).length === 0) {
    errors.push('人格特质问卷必须填写');
  } else {
    const invalidValues = Object.values(data.bfi_data).filter(v => v < 1.0 || v > 5.0);
    if (invalidValues.length > 0) {
      errors.push('人格特质问卷的评分必须在1.0-5.0之间');
    }
  }
  
  if (errors.length > 0) {
    showErrorModal('请检查以下问题：\n' + errors.join('\n'));
    return false;
  }
  
  return true;
}

// 使用示例
async function submitCurrentProfile(userId, profileData) {
  // ✅ 先进行前端验证
  if (!validateCurrentProfile(profileData)) {
    return { success: false, error: 'VALIDATION_FAILED' };
  }
  
  // 验证通过后再提交
  const response = await fetch(`/api/v1/profile/current?user_id=${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData)
  });
  
  // ... 处理响应
}
```

---

### 2. Future Profile (F2.2) - 未来档案

**接口**: `POST /api/v1/profile/future`

#### 验证规则

```javascript
{
  profiles: [  // 必填，1-3个档案
    {
      profile_name: string,      // 必填，1-100字符
      future_values: string,    // 必填，10-2000字符
      future_vision: string,     // 必填，10-2000字符
      future_obstacles: string   // 必填，10-2000字符
    }
  ]
}
```

#### 前端验证示例

```javascript
function validateFutureProfile(data) {
  const errors = [];
  
  // 验证 profiles 数组
  if (!data.profiles || !Array.isArray(data.profiles)) {
    errors.push('至少需要创建1个未来档案');
    return false;
  }
  
  if (data.profiles.length < 1 || data.profiles.length > 3) {
    errors.push('未来档案数量必须在1-3个之间');
  }
  
  // 验证每个档案
  data.profiles.forEach((profile, index) => {
    if (!profile.profile_name || profile.profile_name.length < 1 || profile.profile_name.length > 100) {
      errors.push(`档案${index + 1}的名称必须在1-100字符之间`);
    }
    
    if (!profile.future_values || profile.future_values.length < 10 || profile.future_values.length > 2000) {
      errors.push(`档案${index + 1}的未来价值观必须在10-2000字符之间`);
    }
    
    if (!profile.future_vision || profile.future_vision.length < 10 || profile.future_vision.length > 2000) {
      errors.push(`档案${index + 1}的未来愿景必须在10-2000字符之间`);
    }
    
    if (!profile.future_obstacles || profile.future_obstacles.length < 10 || profile.future_obstacles.length > 2000) {
      errors.push(`档案${index + 1}的未来障碍必须在10-2000字符之间`);
    }
  });
  
  if (errors.length > 0) {
    showErrorModal('请检查以下问题：\n' + errors.join('\n'));
    return false;
  }
  
  return true;
}
```

---

### 3. Letter (F3.1.2) - 提交信件

**接口**: `POST /api/v1/letters/submit`

#### 验证规则

```javascript
{
  content: string  // 必填，50-5000字符
}
```

#### 前端验证示例

```javascript
function validateLetter(content) {
  if (!content || content.trim().length < 50) {
    showErrorModal('信件内容至少需要50个字符，当前：' + (content?.length || 0) + '字符');
    return false;
  }
  
  if (content.length > 5000) {
    showErrorModal('信件内容不能超过5000个字符，当前：' + content.length + '字符');
    return false;
  }
  
  return true;
}

// 使用示例（已在文档中）
const handleSubmit = async () => {
  // ✅ 先进行前端验证
  if (!validateLetter(content)) {
    return;  // 验证失败，不提交
  }
  
  // 验证通过后再提交
  const result = await submitLetter(userId, content);
  // ...
};
```

---

### 4. Chat Message (F3.2.2) - 发送聊天消息

**接口**: `POST /api/v1/chat/{future_profile_id}/send`

#### 验证规则

```javascript
{
  content: string  // 必填，1-1000字符
}
```

#### 前端验证示例

```javascript
function validateChatMessage(content) {
  if (!content || content.trim().length < 1) {
    showErrorModal('消息内容不能为空');
    return false;
  }
  
  if (content.length > 1000) {
    showErrorModal('消息内容不能超过1000个字符，当前：' + content.length + '字符');
    return false;
  }
  
  return true;
}

// 使用示例
async function sendChatMessage(futureProfileId, content) {
  // ✅ 先进行前端验证
  if (!validateChatMessage(content)) {
    return { success: false, error: 'VALIDATION_FAILED' };
  }
  
  // 验证通过后再提交
  const response = await fetch(`/api/v1/chat/${futureProfileId}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  
  // ... 处理响应
}
```

---

### 5. 通用验证工具函数

```javascript
// 统一的错误提示函数
function showErrorModal(message) {
  // 使用你的 UI 库显示模态框
  // 例如：使用 Ant Design、Material-UI、Element UI 等
  alert(message);  // 简单示例，实际应该使用更好的 UI 组件
}

// 字符计数显示（实时反馈）
function CharacterCounter({ text, min, max }) {
  const length = text?.length || 0;
  const isValid = length >= min && length <= max;
  
  return (
    <div className={isValid ? 'text-green' : 'text-red'}>
      {length} / {min}-{max} 字符
    </div>
  );
}

// 使用示例
<textarea 
  value={content}
  onChange={(e) => setContent(e.target.value)}
  placeholder="写下你想对未来的自己说的话..."
/>
<CharacterCounter text={content} min={50} max={5000} />
```

---

### 6. 验证最佳实践

1. **实时验证**: 在用户输入时显示字符计数和验证提示
2. **提交前验证**: 点击提交按钮时再次完整验证
3. **友好提示**: 使用清晰的错误消息，指出具体问题
4. **防止提交**: 验证失败时禁用提交按钮或阻止表单提交
5. **高亮错误**: 在界面上高亮显示有问题的字段

---

## 🔌 核心接口

### 1. 提交信件

**接口**: `POST /api/v1/letters/submit`

**请求参数**:
```json
{
  "content": "信件内容（50-5000字符）"
}
```

**Query参数**: `user_id` (必填)

**响应** (202 Accepted):
```json
{
  "letter_id": "uuid",
  "status": "SUBMITTED"
}
```

**重要特性**:
- ✅ **支持重试**: 如果用户之前提交的信件状态为 `FAILED` 或 `PENDING`，可以重新调用此接口
- ✅ **自动处理**: 后端会自动更新现有信件并重新触发处理
- ❌ **防止重复**: 如果状态为 `REPLIES_READY`（已成功），会返回 400 错误

---

### 2. 轮询信件状态

**接口**: `GET /api/v1/letters/status`

**Query参数**: `user_id` (必填)

**响应** (200 OK):

**情况1: 处理中**
```json
{
  "status": "PENDING",
  "content": null
}
```

**情况2: 处理成功**
```json
{
  "status": "REPLIES_READY",
  "content": null
}
```

**情况3: 处理失败**
```json
{
  "status": "FAILED",
  "content": "信件完整内容..."
}
```

**关键说明**:
- `content` 字段：
  - 当 `status` 为 `FAILED` 时，返回完整信件内容（用于恢复）
  - 当 `status` 为 `PENDING` 或 `REPLIES_READY` 时，`content` 为 `null`
- **用途**: 仅在失败时返回内容，让前端可以恢复用户已写的内容

---

## 🔄 完整交互流程

### 场景1: 正常流程（成功）

```
1. 用户在写信页输入内容
   ↓
2. 调用 POST /letters/submit
   ↓
3. 收到 202 响应，跳转到等待页
   ↓
4. 开始轮询 GET /letters/status（每3秒一次）
   ↓
5. 收到 status: "PENDING", content: null（继续等待）
   ↓
6. 继续轮询...
   ↓
7. 收到 status: "REPLIES_READY", content: null
   ↓
8. 跳转到收信箱页面 ✅
```

### 场景2: 失败后重试

```
1. 用户在写信页输入内容
   ↓
2. 调用 POST /letters/submit
   ↓
3. 收到 202 响应，跳转到等待页
   ↓
4. 开始轮询 GET /letters/status
   ↓
5. 收到 status: "PENDING", content: "..."
   ↓
6. 继续轮询...
   ↓
7. 收到 status: "FAILED", content: "信件内容..."
   ↓
8. 自动跳回写信页
   ↓
9. 使用响应中的 content 恢复编辑框内容
   ↓
10. 显示错误提示："处理失败，请修改后重新提交"
    ↓
11. 用户修改内容后，再次调用 POST /letters/submit（使用相同接口）
    ↓
12. 重新开始轮询流程...
```

---

## 💻 前端实现示例

### 1. 提交信件函数

```javascript
async function submitLetter(userId, content) {
  try {
    const response = await fetch(
      `/api/v1/letters/submit?user_id=${userId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      }
    );
    
    if (response.status === 202) {
      const data = await response.json();
      // 跳转到等待页
      navigate('/waiting');
      // 开始轮询
      pollLetterStatus(userId);
      return { success: true, letterId: data.letter_id };
    } else if (response.status === 400) {
      const error = await response.json();
      if (error.detail === 'LETTER_ALREADY_SUBMITTED') {
        // 信件已成功处理，跳转到收信箱
        navigate('/inbox');
        return { success: true, alreadySubmitted: true };
      }
      throw new Error(error.detail);
    } else {
      throw new Error('提交失败');
    }
  } catch (error) {
    console.error('提交信件失败:', error);
    showError('提交失败，请重试');
    return { success: false, error: error.message };
  }
}
```

### 2. 轮询状态函数

```javascript
async function pollLetterStatus(userId) {
  const maxAttempts = 60; // 最多轮询60次（3分钟）
  let attempts = 0;
  
  const poll = async () => {
    try {
      const response = await fetch(
        `/api/v1/letters/status?user_id=${userId}`
      );
      
      if (!response.ok) {
        throw new Error('获取状态失败');
      }
      
      const data = await response.json();
      
      // 成功：跳转到收信箱
      if (data.status === 'REPLIES_READY') {
        navigate('/inbox');
        return { success: true };
      }
      
      // 失败：跳回写信页并恢复内容
      if (data.status === 'FAILED') {
        navigate('/write-letter');
        // 恢复信件内容
        if (data.content) {
          setLetterContent(data.content);
        }
        showError('信件处理失败，请修改后重新提交');
        return { success: false, error: 'FAILED', canRetry: true };
      }
      
      // 处理中：继续轮询（PENDING 状态不返回内容）
      if (data.status === 'PENDING') {
        attempts++;
        if (attempts >= maxAttempts) {
          // 超时：跳回写信页（但此时没有内容可恢复）
          navigate('/write-letter');
          showError('处理超时，请重新提交信件');
          return { success: false, error: 'TIMEOUT', canRetry: true };
        }
        
        // 3秒后继续轮询
        setTimeout(poll, 3000);
        return { success: false, status: 'PENDING' };
      }
      
    } catch (error) {
      console.error('轮询失败:', error);
      // 网络错误时，可以继续重试
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 3000);
      } else {
        showError('网络错误，请检查连接后重试');
      }
    }
  };
  
  // 开始轮询
  poll();
}
```

### 3. 写信页组件示例

```javascript
function WriteLetterPage() {
  const [content, setContent] = useState('');
  const userId = getUserId(); // 从 localStorage 或其他地方获取
  
  useEffect(() => {
    // 页面加载时，检查是否有本地草稿
    const draft = localStorage.getItem('letter_draft');
    if (draft) {
      setContent(draft);
      localStorage.removeItem('letter_draft'); // 清除草稿
    }
  }, []);
  
  const handleSubmit = async () => {
    if (content.length < 50 || content.length > 5000) {
      showError('信件内容必须在50-5000字符之间');
      return;
    }
    
    const result = await submitLetter(userId, content);
    if (result.success) {
      // 提交成功，跳转到等待页（在 submitLetter 中已处理）
    }
  };
  
  return (
    <div>
      <textarea 
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="写下你想对未来的自己说的话..."
      />
      <button onClick={handleSubmit}>提交</button>
    </div>
  );
}
```

---

## ⚠️ 错误处理

### 常见错误码

| HTTP状态码 | 错误信息 | 处理方式 |
|-----------|---------|---------|
| 400 | `LETTER_ALREADY_SUBMITTED` | 信件已成功处理，跳转到收信箱 |
| 400 | `信件状态为 XXX，无法提交` | 显示错误提示，不允许提交 |
| 404 | `LETTER_NOT_FOUND` | 没有信件，显示空状态 |
| 500 | 服务器错误 | 显示错误提示，允许重试 |

### 错误处理示例

```javascript
async function handleApiError(response) {
  if (response.status === 400) {
    const error = await response.json();
    
    if (error.detail === 'LETTER_ALREADY_SUBMITTED') {
      // 已成功，跳转到收信箱
      navigate('/inbox');
      return;
    }
    
    // 其他400错误
    showError(error.detail || '请求参数错误');
    return;
  }
  
  if (response.status === 404) {
    // 没有信件，可能是首次访问
    return;
  }
  
  if (response.status >= 500) {
    // 服务器错误，允许重试
    showError('服务器错误，请稍后重试');
    return;
  }
}
```

---

## 🔑 关键要点总结

### ✅ 必须实现的功能

1. **状态轮询**: 提交后每3秒轮询一次状态，最多轮询60次（3分钟）
2. **失败处理**: 检测到 `FAILED` 状态时，自动跳回写信页并恢复内容
3. **内容恢复**: 使用轮询响应中的 `content` 字段恢复用户已写的内容
4. **统一接口**: 首次提交和重试都使用同一个 `POST /letters/submit` 接口

### 📝 注意事项

1. **内容保存**: 
   - 轮询时如果收到 `PENDING` 状态，可以保存 `content` 到 `localStorage` 作为备份
   - 失败时优先使用轮询响应中的 `content`，其次使用 `localStorage` 中的备份

2. **状态判断**:
   - `PENDING`: 继续轮询，可选保存内容
   - `REPLIES_READY`: 跳转到收信箱
   - `FAILED`: 跳回写信页，恢复内容，显示错误提示

3. **重试逻辑**:
   - 用户修改内容后，直接调用 `POST /letters/submit`（与首次提交相同）
   - 后端会自动识别是重试还是首次提交
   - 不需要额外的重试接口

4. **用户体验**:
   - 失败时自动恢复内容，用户无需重新输入
   - 显示清晰的错误提示
   - 提供"重新提交"按钮（调用相同的提交接口）

---

## 📞 后端自动重试机制

后端已实现自动重试（前端无需处理）：

- **重试次数**: 最多3次
- **重试间隔**: 指数退避（60秒、120秒、240秒）
- **失败处理**: 3次重试都失败后，状态更新为 `FAILED`
- **前端行为**: 检测到 `FAILED` 状态后，跳回写信页让用户手动重试

---

## 🧪 测试建议

1. **正常流程测试**: 提交→轮询→成功
2. **失败流程测试**: 提交→轮询→失败→恢复内容→重试
3. **超时测试**: 轮询60次后仍未成功，应该跳回写信页
4. **网络错误测试**: 轮询时网络中断，应该继续重试或提示用户

---

**文档版本**: v1.0  
**最后更新**: 2025-01-XX  
**维护者**: 后端开发团队

