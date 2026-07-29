import { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Checkbox } from 'primereact/checkbox';
import { Button } from 'primereact/button';
import { HiOutlineMagnifyingGlass, HiOutlineBell, HiOutlineUserCircle } from 'react-icons/hi2';
import inventoryLogo from '../../assets/inventoryLogo.svg';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import './Login.css';

const kpiTiles = [
    { label: 'Total SKUs', value: '1,248' },
    { label: 'Stock Value', value: 'Rs. 12.5L' },
    { label: 'Open Orders', value: '32' },
    { label: 'Low Stock', value: '6' },
];

const barHeights = [40, 65, 50, 80, 60, 90, 70];

const Login = () => {
    const [email, setEmail] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [password, setPassword] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [rememberMe, setRememberMe] = useState(DEFAULT_DATA_TYPE_VALUE.TRUE);

    const handleSignIn = (e: React.FormEvent) => {
        e.preventDefault();
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-brand-side">
                    <div className="login-brand-header">
                        <img src={inventoryLogo} alt="Inventory System logo" width={28} height={28} />
                        <span>Inventory System</span>
                    </div>

                    <h2 className="login-brand-headline">Effortless Inventory Control for Smarter Decisions</h2>
                    <p className="login-brand-subtext">
                        Track stock, manage kits, and control your warehouse in real time — all in one powerful dashboard.
                    </p>

                    <div className="login-preview-card">
                        <div className="login-preview-topbar">
                            <span className="login-preview-title">Welcome back</span>
                            <div className="login-preview-topbar-icons">
                                <HiOutlineMagnifyingGlass size={14} />
                                <HiOutlineBell size={14} />
                                <HiOutlineUserCircle size={14} />
                            </div>
                        </div>

                        <div className="login-preview-kpis">
                            {kpiTiles.map((kpi) => (
                                <div className="login-preview-kpi" key={kpi.label}>
                                    <span className="login-preview-kpi-value">{kpi.value}</span>
                                    <span className="login-preview-kpi-label">{kpi.label}</span>
                                </div>
                            ))}
                        </div>

                        <div className="login-preview-charts">
                            <div className="login-preview-chart-card">
                                <span className="login-preview-chart-title">Stock Movement</span>
                                <div className="login-preview-bars">
                                    {barHeights.map((height, index) => (
                                        <span key={index} className="login-preview-bar" style={{ height: `${height}%` }} />
                                    ))}
                                </div>
                            </div>
                            <div className="login-preview-chart-card login-preview-donut-card">
                                <span className="login-preview-chart-title">Stock Split</span>
                                <div className="login-preview-donut" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="login-form-side">
                    <div className="login-form-wrapper">
                        <h1 className="login-title">Welcome back</h1>
                        <p className="login-subtitle">Enter your details to access your account.</p>

                        <form className="login-form" onSubmit={handleSignIn}>
                            <div className="form-field">
                                <label>Email</label>
                                <InputText value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" />
                            </div>
                            <div className="form-field">
                                <label>Password</label>
                                <Password
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    toggleMask
                                    feedback={DEFAULT_DATA_TYPE_VALUE.FALSE}
                                    className="login-password-field"
                                    inputClassName="login-password-input"
                                />
                            </div>

                            <div className="login-row">
                                <label className="login-remember">
                                    <Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.checked ?? DEFAULT_DATA_TYPE_VALUE.FALSE)} />
                                    <span>Remember me</span>
                                </label>
                                <a href="#" className="login-link" onClick={(e) => e.preventDefault()}>Forgot password?</a>
                            </div>

                            <Button type="submit" label="Sign in" className="login-submit-btn" />
                        </form>

                        <p className="login-register">
                            Don&apos;t have an account? <a href="#" className="login-link" onClick={(e) => e.preventDefault()}>Register</a>
                        </p>
                    </div>

                    <p className="login-footer">© 2025 Inventory System. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
};
export default Login;
