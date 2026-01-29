import { useState, useEffect } from 'react';
import './App.css';

// 관리자 계정 정보
const ADMIN_EMAIL = 'admin@bandtest.com';
const ADMIN_PASSWORD = 'admin123';

// localStorage 키
const STORAGE_USERS = 'bandTest01_users';
const STORAGE_CODES = 'bandTest01_codes';
const STORAGE_CURRENT_USER = 'bandTest01_currentUser';
const STORAGE_ADMIN = 'bandTest01_admin';

// localStorage 기반 데이터 관리
const storage = {
    // 사용자 가져오기
    getUsers: () => {
        const data = localStorage.getItem(STORAGE_USERS);
        return data ? JSON.parse(data) : {};
    },

    // 사용자 저장
    saveUser: (user) => {
        const users = storage.getUsers();
        users[user.email] = user;
        localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
        return user;
    },

    // 사용자 가져오기 (이메일로)
    getUser: (email) => {
        const users = storage.getUsers();
        return users[email] || null;
    },

    // 사용자 칩 업데이트
    updateUserChips: (email, chips) => {
        const users = storage.getUsers();
        if (users[email]) {
            users[email].tokens = chips;
            localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
            return users[email];
        }
        return null;
    },

    // 코드 생성
    createCode: (chips) => {
        const codes = storage.getCodes();
        const code = generateRandomCode();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        codes[code] = {
            code,
            chips,
            createdAt: new Date().toISOString(),
            expiresAt,
            usedBy: null,
            usedAt: null
        };
        
        localStorage.setItem(STORAGE_CODES, JSON.stringify(codes));
        return { code, chips, expiresAt };
    },

    // 모든 코드 가져오기
    getCodes: () => {
        const data = localStorage.getItem(STORAGE_CODES);
        return data ? JSON.parse(data) : {};
    },

    // 코드 사용
    useCode: (code, email) => {
        const codes = storage.getCodes();
        const codeUpper = code.toUpperCase();
        
        if (!codes[codeUpper]) {
            throw new Error('유효하지 않은 코드입니다.');
        }
        
        const codeData = codes[codeUpper];
        
        if (codeData.usedBy) {
            throw new Error('이미 사용된 코드입니다.');
        }
        
        if (new Date(codeData.expiresAt) < new Date()) {
            throw new Error('만료된 코드입니다.');
        }
        
        const user = storage.getUser(email);
        if (!user) {
            throw new Error('사용자를 찾을 수 없습니다.');
        }
        
        // 칩 추가
        user.tokens += codeData.chips;
        storage.saveUser(user);
        
        // 코드 사용 처리
        codeData.usedBy = email;
        codeData.usedAt = new Date().toISOString();
        codes[codeUpper] = codeData;
        localStorage.setItem(STORAGE_CODES, JSON.stringify(codes));
        
        return { chips: codeData.chips };
    }
};

// 6자리 랜덤 코드 생성
const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// 현재 로그인한 사용자 이메일 가져오기
const getCurrentUserEmail = () => {
    return localStorage.getItem(STORAGE_CURRENT_USER);
};

// 현재 로그인한 사용자 저장하기
const setCurrentUser = (email) => {
    if (email) {
        localStorage.setItem(STORAGE_CURRENT_USER, email);
    } else {
        localStorage.removeItem(STORAGE_CURRENT_USER);
    }
};

// 관리자 로그인 여부 확인
const isAdminLoggedIn = () => {
    return localStorage.getItem(STORAGE_ADMIN) === 'true';
};

// 관리자 로그인 설정
const setAdminLoggedIn = (isAdmin) => {
    if (isAdmin) {
        localStorage.setItem(STORAGE_ADMIN, 'true');
    } else {
        localStorage.removeItem(STORAGE_ADMIN);
    }
};

// 스코어보드 데이터 가져오기
const getScoreboard = () => {
    const users = storage.getUsers();
    const usersArray = Object.values(users);
    return usersArray.sort((a, b) => (b.tokens || 0) - (a.tokens || 0));
};

function SignupForm({ onSuccess }) {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState({});
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
        setSuccess('');
    };

    const validateForm = () => {
        const newErrors = {};
        const users = storage.getUsers();

        if (!formData.name.trim()) {
            newErrors.name = '이름을 입력해주세요';
        } else {
            const nameExists = Object.values(users).some(user => user.name === formData.name.trim());
            if (nameExists) {
                newErrors.name = '이미 사용 중인 닉네임입니다';
            }
        }

        if (!formData.email.trim()) {
            newErrors.email = '이메일을 입력해주세요';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = '올바른 이메일 형식을 입력해주세요';
        } else if (users[formData.email]) {
            newErrors.email = '이미 가입된 이메일입니다';
        }

        if (!formData.password) {
            newErrors.password = '비밀번호를 입력해주세요';
        } else if (formData.password.length < 6) {
            newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validateForm()) {
            storage.saveUser({
                name: formData.name.trim(),
                email: formData.email,
                password: formData.password,
                tokens: 10
            });
            setSuccess('회원가입이 완료되었습니다! 자동으로 로그인됩니다.');
            
            setTimeout(() => {
                setCurrentUser(formData.email);
                onSuccess();
            }, 1000);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label className="form-label" htmlFor="signup-name">이름</label>
                <input
                    type="text"
                    id="signup-name"
                    name="name"
                    className="form-input"
                    placeholder="이름을 입력하세요"
                    value={formData.name}
                    onChange={handleChange}
                />
                {errors.name && <div className="error-message">{errors.name}</div>}
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="signup-email">이메일</label>
                <input
                    type="email"
                    id="signup-email"
                    name="email"
                    className="form-input"
                    placeholder="이메일을 입력하세요"
                    value={formData.email}
                    onChange={handleChange}
                />
                {errors.email && <div className="error-message">{errors.email}</div>}
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="signup-password">비밀번호</label>
                <input
                    type="password"
                    id="signup-password"
                    name="password"
                    className="form-input"
                    placeholder="비밀번호를 입력하세요"
                    value={formData.password}
                    onChange={handleChange}
                />
                {errors.password && <div className="error-message">{errors.password}</div>}
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="signup-confirmPassword">비밀번호 확인</label>
                <input
                    type="password"
                    id="signup-confirmPassword"
                    name="confirmPassword"
                    className="form-input"
                    placeholder="비밀번호를 다시 입력하세요"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                />
                {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
            </div>

            {success && <div className="success-message">{success}</div>}
            {errors.submit && <div className="error-message">{errors.submit}</div>}

            <button type="submit" className="submit-button">
                가입하기
            </button>
        </form>
    );
}

function LoginForm({ onSuccess }) {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        // 관리자 계정 체크
        if (formData.email === ADMIN_EMAIL && formData.password === ADMIN_PASSWORD) {
            setAdminLoggedIn(true);
            onSuccess();
            return;
        }

        const user = storage.getUser(formData.email);

        if (!user || user.password !== formData.password) {
            setError('이메일 또는 비밀번호가 일치하지 않습니다.');
            return;
        }

        setCurrentUser(formData.email);
        onSuccess();
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label className="form-label" htmlFor="login-email">이메일</label>
                <input
                    type="email"
                    id="login-email"
                    name="email"
                    className="form-input"
                    placeholder="이메일을 입력하세요"
                    value={formData.email}
                    onChange={handleChange}
                />
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="login-password">비밀번호</label>
                <input
                    type="password"
                    id="login-password"
                    name="password"
                    className="form-input"
                    placeholder="비밀번호를 입력하세요"
                    value={formData.password}
                    onChange={handleChange}
                />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="submit-button">
                로그인
            </button>
        </form>
    );
}

function AdminDashboard({ onLogout }) {
    const [chips, setChips] = useState('');
    const [generatedCode, setGeneratedCode] = useState('');
    const [codes, setCodes] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        loadCodes();
    }, []);

    const loadCodes = () => {
        const allCodes = storage.getCodes();
        setCodes(Object.values(allCodes));
    };

    const handleGenerateCode = () => {
        const chipsValue = parseInt(chips);
        if (!chips || isNaN(chipsValue) || chipsValue <= 0) {
            setError('올바른 칩 개수를 입력해주세요.');
            return;
        }

        try {
            const result = storage.createCode(chipsValue);
            setGeneratedCode(result.code);
            setSuccess(`코드가 생성되었습니다: ${result.code}`);
            setError('');
            setChips('');
            loadCodes();
        } catch (error) {
            setError('코드 생성에 실패했습니다.');
            setSuccess('');
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('ko-KR');
    };

    const isExpired = (expiresAt) => {
        return new Date(expiresAt) < new Date();
    };

    return (
        <div className="admin-dashboard">
            <h1 className="title">관리자 대시보드</h1>
            
            <div className="admin-section">
                <h2 className="admin-section-title">코드 생성</h2>
                <div className="form-group">
                    <label className="form-label">칩 개수</label>
                    <input
                        type="number"
                        className="form-input"
                        placeholder="칩 개수를 입력하세요"
                        value={chips}
                        onChange={(e) => setChips(e.target.value)}
                        min="1"
                    />
                </div>
                <button className="submit-button" onClick={handleGenerateCode}>
                    코드 생성
                </button>
                {success && <div className="success-message">{success}</div>}
                {error && <div className="error-message">{error}</div>}
                {generatedCode && (
                    <div className="generated-code">
                        <h3>생성된 코드:</h3>
                        <div className="code-display">{generatedCode}</div>
                    </div>
                )}
            </div>

            <div className="admin-section">
                <h2 className="admin-section-title">생성된 코드 목록</h2>
                <div className="codes-list">
                    {codes.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                            생성된 코드가 없습니다.
                        </div>
                    ) : (
                        codes.map((codeItem, index) => (
                            <div key={index} className={`code-item ${isExpired(codeItem.expiresAt) ? 'expired' : ''}`}>
                                <div className="code-info">
                                    <span className="code-text">{codeItem.code}</span>
                                    <span className="code-chips">{codeItem.chips}칩</span>
                                </div>
                                <div className="code-meta">
                                    <span>만료: {formatDate(codeItem.expiresAt)}</span>
                                    <span className={isExpired(codeItem.expiresAt) ? 'expired-badge' : 'active-badge'}>
                                        {isExpired(codeItem.expiresAt) ? '만료됨' : '유효'}
                                    </span>
                                </div>
                                {codeItem.usedBy && (
                                    <div className="code-used">
                                        사용자: {codeItem.usedBy}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            <button className="logout-button" onClick={onLogout}>
                관리자 로그아웃
            </button>
        </div>
    );
}

function CodeInputView({ user, onCodeUsed, onBack, onNavigateToShop, onNavigateToRoulette }) {
    const [code, setCode] = useState('');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!code.trim()) {
            setMessage('코드를 입력해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            const result = storage.useCode(code.toUpperCase(), user.email);
            setMessage(`코드 사용 성공! ${result.chips}칩을 획득했습니다.`);
            setCode('');
            setTimeout(() => {
                setMessage('');
                onCodeUsed();
            }, 2000);
        } catch (error) {
            setMessage(error.message || '코드 사용에 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <h1 className="title">코드 입력</h1>
            <div className="user-info">
                <div className="chip-display">
                    <span className="chip-label">보유 칩</span>
                    <span className="chip-count">{user.tokens}개</span>
                </div>
                <div className="nav-buttons">
                    <button className="nav-button" onClick={onBack}>메인</button>
                    <button className="nav-button" onClick={onNavigateToShop}>상점</button>
                    <button className="nav-button" onClick={onNavigateToRoulette}>룰렛</button>
                    <button className="nav-button active">코드 입력</button>
                </div>
            </div>
            <div className="code-input-section">
                <h2 className="code-input-title">코드 입력</h2>
                <form onSubmit={handleSubmit} className="code-input-form">
                    <input
                        type="text"
                        className="code-input-field"
                        placeholder="코드 입력 (6자리)"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                        maxLength="6"
                        disabled={isLoading}
                    />
                    <button 
                        type="submit"
                        className="code-submit-button"
                        disabled={isLoading || !code.trim()}
                    >
                        {isLoading ? '처리 중...' : '코드 사용'}
                    </button>
                </form>
                {message && (
                    <div className={`code-message ${message.includes('성공') ? 'success-message' : 'error-message'}`}>
                        {message}
                    </div>
                )}
            </div>
        </>
    );
}

function Scoreboard({ currentUserEmail, onRefresh }) {
    const [scoreboard, setScoreboard] = useState([]);

    useEffect(() => {
        const updateScoreboard = () => {
            const sortedUsers = getScoreboard();
            setScoreboard(sortedUsers);
        };

        updateScoreboard();
        const interval = setInterval(updateScoreboard, 1000);
        return () => clearInterval(interval);
    }, [onRefresh]);

    return (
        <div className="scoreboard">
            <h2 className="scoreboard-title">스코어보드</h2>
            <div className="scoreboard-list">
                {scoreboard.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        등록된 사용자가 없습니다.
                    </div>
                ) : (
                    scoreboard.slice(0, 10).map((user, index) => (
                        <div
                            key={user.email}
                            className={`scoreboard-item ${user.email === currentUserEmail ? 'current-user' : ''}`}
                        >
                            <span className="scoreboard-rank">{index + 1}위</span>
                            <span className="scoreboard-name">{user.name}</span>
                            <span className="scoreboard-chips">{user.tokens || 0}칩</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function ShopItem({ itemNumber, itemPrice, user, onPurchase }) {
    const [itemName, setItemName] = useState('');

    const defaultNames = {
        1: 'DO OR DIE 1',
        2: 'DO OR DIE 2',
        3: 'RUSSIAN ROULETTE',
        4: 'ALL OR NOTHING'
    };

    const descriptions = {
        1: '가나다라',
        2: '가나다라',
        3: '가나다라',
        4: '가나다라'
    };

    useEffect(() => {
        const names = JSON.parse(localStorage.getItem('bandTest01_itemNames') || '{}');
        setItemName(names[itemNumber] || defaultNames[itemNumber] || `아이템 ${itemNumber}`);
    }, []);

    const handleItemClick = () => {
        if (itemNumber === 4) {
            if (user.tokens >= 1) {
                onPurchase(itemNumber);
            }
        } else {
            if (user.tokens >= itemPrice) {
                onPurchase(itemNumber);
            }
        }
    };

    const getPriceDisplay = () => {
        if (itemNumber === 4) {
            return '올 인';
        }
        return `칩 ${itemPrice}개`;
    };

    const isDisabled = () => {
        if (itemNumber === 4) {
            return user.tokens < 1;
        }
        return user.tokens < itemPrice;
    };

    return (
        <div
            className={`shop-item ${isDisabled() ? 'disabled' : ''}`}
            onClick={handleItemClick}
        >
            <div className="item-name">{itemName}</div>
            {descriptions[itemNumber] && (
                <div className="item-description">{descriptions[itemNumber]}</div>
            )}
            <div className="item-price">{getPriceDisplay()}</div>
        </div>
    );
}

function Shop({ user, onPurchase }) {
    const [purchaseMessage, setPurchaseMessage] = useState('');

    const getItemPrice = (itemNumber) => {
        if (itemNumber === 1) return 2;
        if (itemNumber === 2) return 5;
        if (itemNumber === 3) return 20;
        if (itemNumber === 4) return user.tokens;
        return 0;
    };

    const handlePurchase = (itemNumber) => {
        const users = storage.getUsers();
        
        if (itemNumber === 1) {
            const price = 2;
            
            if (user.tokens < price) {
                setPurchaseMessage('칩이 부족합니다!');
                setTimeout(() => setPurchaseMessage(''), 2000);
                return;
            }

            const newChipCount = user.tokens - price;
            storage.updateUserChips(user.email, newChipCount);
            
            const isSuccess = Math.random() < 0.5;
            
            if (isSuccess) {
                const finalChipCount = newChipCount + 2;
                storage.updateUserChips(user.email, finalChipCount);
                setPurchaseMessage('칩 2개 획득!');
            } else {
                const finalChipCount = Math.max(0, newChipCount - 3);
                storage.updateUserChips(user.email, finalChipCount);
                setPurchaseMessage('칩 3개 차감!');
            }
            
            setTimeout(() => {
                setPurchaseMessage('');
                onPurchase();
            }, 2000);
        } else if (itemNumber === 2) {
            const price = 5;
            
            if (user.tokens < price) {
                setPurchaseMessage('칩이 부족합니다!');
                setTimeout(() => setPurchaseMessage(''), 2000);
                return;
            }

            const newChipCount = user.tokens - price;
            storage.updateUserChips(user.email, newChipCount);
            
            const isSuccess = Math.random() < 0.5;
            const finalChipCount = isSuccess 
                ? newChipCount + 5 
                : Math.max(0, newChipCount - 6);
            
            storage.updateUserChips(user.email, finalChipCount);
            setPurchaseMessage(isSuccess ? '칩 5개 획득!' : '칩 6개 차감!');
            setTimeout(() => {
                setPurchaseMessage('');
                onPurchase();
            }, 2000);
        } else if (itemNumber === 3) {
            const price = 20;
            
            if (user.tokens < price) {
                setPurchaseMessage('칩이 부족합니다!');
                setTimeout(() => setPurchaseMessage(''), 2000);
                return;
            }

            const newChipCount = user.tokens - price;
            storage.updateUserChips(user.email, newChipCount);
            
            const allUsers = Object.values(users);
            if (allUsers.length === 0) {
                setPurchaseMessage('다른 사용자가 없습니다!');
                setTimeout(() => {
                    setPurchaseMessage('');
                    onPurchase();
                }, 2000);
                return;
            }
            
            const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
            const isSuccess = Math.random() < 0.5;
            
            if (isSuccess) {
                const doubledChips = (randomUser.tokens || 0) * 2;
                storage.updateUserChips(randomUser.email, doubledChips);
                setPurchaseMessage(`${randomUser.name}님의 칩이 2배가 되었습니다!`);
            } else {
                const halvedChips = Math.floor((randomUser.tokens || 0) / 2);
                storage.updateUserChips(randomUser.email, halvedChips);
                setPurchaseMessage(`${randomUser.name}님의 칩이 절반으로 줄었습니다!`);
            }
            
            setTimeout(() => {
                setPurchaseMessage('');
                onPurchase();
            }, 2000);
        } else if (itemNumber === 4) {
            if (user.tokens < 1) {
                setPurchaseMessage('칩이 부족합니다!');
                setTimeout(() => setPurchaseMessage(''), 2000);
                return;
            }

            const currentChips = user.tokens;
            const isSuccess = Math.random() < 0.5;
            
            if (isSuccess) {
                const newChipCount = currentChips * 2;
                storage.updateUserChips(user.email, newChipCount);
                setPurchaseMessage(`잭팟! 칩 ${newChipCount}개 획득!`);
            } else {
                storage.updateUserChips(user.email, 0);
                setPurchaseMessage('모든 칩을 잃었습니다...');
            }
            
            setTimeout(() => {
                setPurchaseMessage('');
                onPurchase();
            }, 2000);
        }
    };

    return (
        <div className="shop-section">
            <h3 className="shop-title">상점</h3>
            <div className="shop-grid">
                {[1, 2, 3, 4].map((itemNumber) => {
                    const itemPrice = getItemPrice(itemNumber);
                    return (
                        <ShopItem
                            key={itemNumber}
                            itemNumber={itemNumber}
                            itemPrice={itemPrice}
                            user={user}
                            onPurchase={handlePurchase}
                        />
                    );
                })}
            </div>
            {purchaseMessage && (
                <div className={`purchase-message ${purchaseMessage.includes('부족') || purchaseMessage.includes('잃었') || purchaseMessage.includes('차감') || purchaseMessage.includes('줄었') ? 'error-message' : 'success-message'}`}>
                    {purchaseMessage}
                </div>
            )}
        </div>
    );
}

function Roulette({ user, onSpin }) {
    const [cards, setCards] = useState(['', '', '']);
    const [isSpinning, setIsSpinning] = useState(false);
    const [result, setResult] = useState('');
    const emojis = ['♚', '♛', '♜', '♝', '♞', '♟'];

    const handleSpin = () => {
        if (user.tokens < 5) {
            setResult('칩이 부족합니다!');
            setTimeout(() => setResult(''), 2000);
            return;
        }

        setIsSpinning(true);
        setResult('');

        const newChipCount = user.tokens - 5;
        storage.updateUserChips(user.email, newChipCount);
        onSpin();

        setTimeout(() => {
            const newCards = cards.map(() => {
                const randomIndex = Math.floor(Math.random() * emojis.length);
                return emojis[randomIndex];
            });
            setCards(newCards);
            setIsSpinning(false);

            if (newCards[0] === newCards[1] && newCards[1] === newCards[2]) {
                setResult('잭팟!!');
                const jackpotChips = newChipCount + 100;
                storage.updateUserChips(user.email, jackpotChips);
                onSpin();
            } else {
                setResult('꽝');
            }
        }, 1000);
    };

    return (
        <div className="roulette-section">
            <h2 className="roulette-title">룰렛</h2>
            <div className="roulette-cards">
                {cards.map((emoji, index) => (
                    <div key={index} className={`roulette-card ${isSpinning ? 'spinning' : ''}`}>
                        {emoji || '?'}
                    </div>
                ))}
            </div>
            {result && (
                <div className={`roulette-result ${result === '잭팟!!' ? 'jackpot' : 'fail'}`}>
                    {result}
                </div>
            )}
            <button 
                className="roulette-spin-button" 
                onClick={handleSpin}
                disabled={isSpinning || user.tokens < 5}
            >
                {isSpinning ? '돌리는 중...' : '룰렛 돌리기 (칩 5개)'}
            </button>
        </div>
    );
}

function MainView({ user, onLogout, onNavigateToShop, onNavigateToRoulette, onNavigateToCode, refreshTrigger }) {
    return (
        <>
            <h1 className="title">내 정보</h1>
            <div className="user-info">
                <div className="chip-display">
                    <span className="chip-label">보유 칩</span>
                    <span className="chip-count">{user.tokens}개</span>
                </div>
                <div className="nav-buttons">
                    <button className="nav-button active">메인</button>
                    <button className="nav-button" onClick={onNavigateToShop}>상점</button>
                    <button className="nav-button" onClick={onNavigateToRoulette}>룰렛</button>
                    <button className="nav-button" onClick={onNavigateToCode}>코드 입력</button>
                </div>
            </div>
            <Scoreboard currentUserEmail={user.email} onRefresh={refreshTrigger} />
            <button className="logout-button" onClick={onLogout}>
                로그아웃
            </button>
        </>
    );
}

function ShopView({ user, onBack, onPurchase, onNavigateToRoulette, onNavigateToCode, refreshTrigger }) {
    return (
        <>
            <h1 className="title">상점</h1>
            <div className="user-info">
                <div className="chip-display">
                    <span className="chip-label">보유 칩</span>
                    <span className="chip-count">{user.tokens}개</span>
                </div>
                <div className="nav-buttons">
                    <button className="nav-button" onClick={onBack}>메인</button>
                    <button className="nav-button active">상점</button>
                    <button className="nav-button" onClick={onNavigateToRoulette}>룰렛</button>
                    <button className="nav-button" onClick={onNavigateToCode}>코드 입력</button>
                </div>
            </div>
            <Shop user={user} onPurchase={onPurchase} />
        </>
    );
}

function RouletteView({ user, onBack, onPurchase, onNavigateToShop, onNavigateToCode, refreshTrigger }) {
    return (
        <>
            <h1 className="title">룰렛</h1>
            <div className="user-info">
                <div className="chip-display">
                    <span className="chip-label">보유 칩</span>
                    <span className="chip-count">{user.tokens}개</span>
                </div>
                <div className="nav-buttons">
                    <button className="nav-button" onClick={onBack}>메인</button>
                    <button className="nav-button" onClick={onNavigateToShop}>상점</button>
                    <button className="nav-button active">룰렛</button>
                    <button className="nav-button" onClick={onNavigateToCode}>코드 입력</button>
                </div>
            </div>
            <Roulette user={user} onSpin={onPurchase} />
        </>
    );
}

function UserDashboard({ onLogout }) {
    const [user, setUser] = useState(null);
    const [currentView, setCurrentView] = useState('main');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    useEffect(() => {
        const loadUser = () => {
            const email = getCurrentUserEmail();
            if (email) {
                const userData = storage.getUser(email);
                if (userData) {
                    setUser(userData);
                }
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            const email = getCurrentUserEmail();
            if (email) {
                const userData = storage.getUser(email);
                if (userData) {
                    setUser(userData);
                    setRefreshTrigger(prev => prev + 1);
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const handleLogout = () => {
        setCurrentUser(null);
        onLogout();
    };

    const handlePurchase = () => {
        const email = getCurrentUserEmail();
        if (email) {
            const userData = storage.getUser(email);
            if (userData) {
                setUser(userData);
                setRefreshTrigger(prev => prev + 1);
            }
        }
    };

    if (!user) {
        return <div>사용자 정보를 불러올 수 없습니다.</div>;
    }

    if (currentView === 'shop') {
        return (
            <ShopView
                user={user}
                onBack={() => setCurrentView('main')}
                onPurchase={handlePurchase}
                onNavigateToRoulette={() => setCurrentView('roulette')}
                onNavigateToCode={() => setCurrentView('code')}
                refreshTrigger={refreshTrigger}
            />
        );
    }

    if (currentView === 'roulette') {
        return (
            <RouletteView
                user={user}
                onBack={() => setCurrentView('main')}
                onPurchase={handlePurchase}
                onNavigateToShop={() => setCurrentView('shop')}
                onNavigateToCode={() => setCurrentView('code')}
                refreshTrigger={refreshTrigger}
            />
        );
    }

    if (currentView === 'code') {
        return (
            <CodeInputView
                user={user}
                onCodeUsed={handlePurchase}
                onBack={() => setCurrentView('main')}
                onNavigateToShop={() => setCurrentView('shop')}
                onNavigateToRoulette={() => setCurrentView('roulette')}
            />
        );
    }

    return (
        <MainView
            user={user}
            onLogout={handleLogout}
            onNavigateToShop={() => setCurrentView('shop')}
            onNavigateToRoulette={() => setCurrentView('roulette')}
            onNavigateToCode={() => setCurrentView('code')}
            refreshTrigger={refreshTrigger}
        />
    );
}

function App() {
    const [mode, setMode] = useState('signup');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkLogin = () => {
            if (isAdminLoggedIn()) {
                setIsAdmin(true);
                setIsLoggedIn(true);
            } else {
                const email = getCurrentUserEmail();
                if (email) {
                    const user = storage.getUser(email);
                    if (user) {
                        setIsLoggedIn(true);
                    }
                }
            }
        };
        checkLogin();
    }, []);

    const handleLoginSuccess = () => {
        setIsLoggedIn(true);
        if (isAdminLoggedIn()) {
            setIsAdmin(true);
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setIsAdmin(false);
        setMode('signup');
        setCurrentUser(null);
        setAdminLoggedIn(false);
    };

    if (isLoggedIn && isAdmin) {
        return <AdminDashboard onLogout={handleLogout} />;
    }

    if (isLoggedIn) {
        return <UserDashboard onLogout={handleLogout} />;
    }

    return (
        <>
            <h1 className="title">{mode === 'signup' ? '회원가입' : '로그인'}</h1>
            <div className="mode-toggle">
                <button
                    className={`mode-button ${mode === 'signup' ? 'active' : ''}`}
                    onClick={() => setMode('signup')}
                >
                    회원가입
                </button>
                <button
                    className={`mode-button ${mode === 'login' ? 'active' : ''}`}
                    onClick={() => setMode('login')}
                >
                    로그인
                </button>
            </div>
            {mode === 'signup' ? (
                <SignupForm onSuccess={handleLoginSuccess} />
            ) : (
                <LoginForm onSuccess={handleLoginSuccess} />
            )}
        </>
    );
}

export default App;