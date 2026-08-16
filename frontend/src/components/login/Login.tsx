import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import {
    HiOutlineEnvelope,
    HiOutlineLockClosed,
    HiOutlineArrowDownTray,
    HiOutlineShoppingCart,
    HiOutlineClipboardDocumentList,
    HiOutlineDocumentText,
    HiOutlineExclamationTriangle,
    HiCube,
} from 'react-icons/hi2';
import { BsBoxSeam, BsGrid1X2 } from 'react-icons/bs';
import inventoryLogo from '../../assets/inventoryLogo.png';
import loginLogo from '../../assets/LoginLogo.png';
import { DEFAULT_DATA_TYPE_VALUE } from '../../common/constants/commonConstant';
import { useAuthContext } from '../../context/AuthContextDefinition';
import './Login.css';

// Points for the laptop's "Stock Overview" mini chart - a plain rising trend line (not real
// data, purely decorative), rendered as an SVG polyline + per-point dot markers sized to a
// 0-100 viewBox.
const stockOverviewPoints: Array<[number, number]> = [[0, 78], [14, 70], [28, 74], [42, 58], [56, 62], [70, 38], [84, 44], [100, 20]];
const stockOverviewPolyline = stockOverviewPoints.map(([x, y]) => `${x},${y}`).join(' ');
const chartGridlineX = [0, 20, 40, 60, 80, 100];
const stockReportBars = [24, 34, 44, 58, 72, 92];

// Typewriter copy for the illustration panel - typed once on load (title, then subtitle),
// never loops/erases back, since this is the page's actual headline copy, not a decorative
// loop like the rest of the illustration's animations.
const ILLUSTRATION_TITLE = 'Effortless Inventory Control for Smarter Decisions';
const ILLUSTRATION_TITLE_HIGHLIGHT = 'Smarter Decisions';
const ILLUSTRATION_SUBTITLE = 'Track stock, manage orders, and control your warehouse in real-time — all in one powerful dashboard.';
const TITLE_HIGHLIGHT_START = ILLUSTRATION_TITLE.indexOf(ILLUSTRATION_TITLE_HIGHLIGHT);

// Purely decorative sample rows for the laptop's "Recent Activity" list - not real data.
const recentActivity = [
    { icon: HiCube, tone: 'blue', title: 'New stock received', subtitle: '150 items added', time: '10:30 AM' },
    { icon: HiOutlineShoppingCart, tone: 'green', title: 'Order created', subtitle: 'Order #INV-245', time: 'Yesterday' },
    { icon: HiOutlineExclamationTriangle, tone: 'orange', title: 'Low stock alert', subtitle: '32 items are running low', time: 'Yesterday' },
    { icon: HiOutlineDocumentText, tone: 'purple', title: 'Invoice generated', subtitle: 'INV-1024', time: '2 Aug 2026' },
] as const;

// A genuine 3D box (top/front/right faces via real CSS 3D transforms - preserve-3d +
// rotateX/rotateY/translateZ - not a 2D skew approximation), used for both the blue cube
// stack and the tan carton stack below the laptop. `className` carries the size/position
// (see Login.css's login-cube3d--N / login-carton--N), this component only owns the 3-face
// geometry and per-instance face colors.
const Box3D = ({ className, front, right, top }: { className: string; front: string; right: string; top: string }) => (
    <span className={className}>
        <span className="login-box3d-inner">
            <span className="login-box3d-face login-box3d-face--front" style={{ background: front }} />
            <span className="login-box3d-face login-box3d-face--right" style={{ background: right }} />
            <span className="login-box3d-face login-box3d-face--top" style={{ background: top }} />
        </span>
    </span>
);

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuthContext();
    const [email, setEmail] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [password, setPassword] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [errorMessage, setErrorMessage] = useState(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
    const [isSubmitting, setIsSubmitting] = useState(DEFAULT_DATA_TYPE_VALUE.FALSE);

    // Typewriter reveal: each effect re-schedules itself by depending on its own counter, one
    // tick at a time - title types first, subtitle only starts once the title is fully typed.
    // Reduced-motion users start already fully-typed (lazy initializer, not a follow-up effect
    // + setState, which would trigger react-hooks/set-state-in-effect and an extra render).
    const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const [typedTitleCount, setTypedTitleCount] = useState(() => (prefersReducedMotion() ? ILLUSTRATION_TITLE.length : DEFAULT_DATA_TYPE_VALUE.ZERO));
    const [typedSubtitleCount, setTypedSubtitleCount] = useState(() => (prefersReducedMotion() ? ILLUSTRATION_SUBTITLE.length : DEFAULT_DATA_TYPE_VALUE.ZERO));

    useEffect(() => {
        if (typedTitleCount >= ILLUSTRATION_TITLE.length) return;
        const timer = setTimeout(() => setTypedTitleCount((count) => count + 1), 32);
        return () => clearTimeout(timer);
    }, [typedTitleCount]);

    useEffect(() => {
        if (typedTitleCount < ILLUSTRATION_TITLE.length) return;
        if (typedSubtitleCount >= ILLUSTRATION_SUBTITLE.length) return;
        const timer = setTimeout(() => setTypedSubtitleCount((count) => count + 1), typedSubtitleCount === 0 ? 400 : 14);
        return () => clearTimeout(timer);
    }, [typedTitleCount, typedSubtitleCount]);

    const isTitleTyped = typedTitleCount >= ILLUSTRATION_TITLE.length;
    const typedTitle = ILLUSTRATION_TITLE.slice(0, typedTitleCount);
    const typedTitleNormal = typedTitle.slice(0, TITLE_HIGHLIGHT_START);
    const typedTitleHighlight = typedTitle.slice(TITLE_HIGHLIGHT_START);
    const typedSubtitle = ILLUSTRATION_SUBTITLE.slice(0, typedSubtitleCount);

    const handleSignIn = async (e: FormEvent) => {
        e.preventDefault();
        setErrorMessage(DEFAULT_DATA_TYPE_VALUE.EMPTY_STRING);
        setIsSubmitting(DEFAULT_DATA_TYPE_VALUE.TRUE);
        const result = await login(email, password);
        setIsSubmitting(DEFAULT_DATA_TYPE_VALUE.FALSE);
        if (result.success) {
            navigate('/');
        } else {
            setErrorMessage(result.message);
        }
    };

    return (
        <div className="login-page">
            <div className="login-form-panel">
                <div className="login-brand-header">
                    <img src={loginLogo} alt="Inventory System" className="login-brand-wordmark" />
                </div>

                <div className="login-form-wrapper">
                    <h1 className="login-title">Welcome back!</h1>
                    <p className="login-subtitle">Log in to your account to continue</p>

                    {errorMessage && <p className="login-error">{errorMessage}</p>}

                    <form className="login-form" onSubmit={handleSignIn}>
                        <div className="form-field">
                            <label>Email</label>
                            <IconField iconPosition="left">
                                <InputIcon><HiOutlineEnvelope size={16} /></InputIcon>
                                <InputText value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" className="login-input" />
                            </IconField>
                        </div>
                        <div className="form-field">
                            <label>Password</label>
                            {/* Password's own toggleMask eye icon already uses PrimeReact's IconField
                                internally, so nesting another IconField around the whole component (for
                                the left lock icon) would create two overlapping icon-field structures -
                                a plain absolutely-positioned icon sidesteps that entirely. */}
                            <div className="login-password-wrapper">
                                <HiOutlineLockClosed size={16} className="login-password-left-icon" />
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
                        </div>

                        <div className="login-row">
                            <a href="#" className="login-link" onClick={(e) => e.preventDefault()}>Forgot password?</a>
                        </div>

                        <Button type="submit" label={isSubmitting ? 'Signing in…' : 'Sign in'} disabled={isSubmitting} className="login-submit-btn" />
                    </form>

                    <hr className="login-divider" />

                    <p className="login-register">
                        New here? <a href="#" className="login-link" onClick={(e) => e.preventDefault()}>Create an account</a>
                    </p>
                </div>
            </div>

            <div className="login-illustration-panel">
                <div className="login-illustration-text">
                    <h2 className="login-illustration-title">
                        {typedTitleNormal}
                        <span className="login-illustration-title-highlight">{typedTitleHighlight}</span>
                        {!isTitleTyped && <span className="login-typing-cursor" />}
                    </h2>
                    <p className="login-illustration-subtitle">
                        {typedSubtitle}
                        {isTitleTyped && <span className="login-typing-cursor" />}
                    </p>
                </div>

                <span className="login-dot-grid login-dot-grid--tl" />
                <span className="login-dot-grid login-dot-grid--br" />
                <span className="login-glow-circle" />

                <div className="login-scene">
                    {/* Floating badge cards - purely decorative, positioned around the laptop
                        (see Login.css for exact placement). A flat-card approximation of the
                        reference's isometric warehouse illustration, not a pixel copy - a
                        photorealistic 3D scene (forklift, shelving) isn't practical to hand-build
                        in CSS/SVG, so this keeps the same idea (laptop + floating stat cards +
                        stock/box motifs) in this app's existing flat design language instead. */}
                    <div className="login-badge login-badge--cube">
                        <HiCube size={26} />
                    </div>
                    <span className="login-connector login-connector--cube-lowstock" />

                    <div className="login-badge login-badge--pill login-badge--low-stock">
                        <span className="login-badge-icon"><HiCube size={16} /></span>
                        <span className="login-badge-text">
                            <strong>Low Stock</strong>
                            <span>32 items</span>
                        </span>
                    </div>

                    <div className="login-laptop">
                        <div className="login-laptop-screen">
                            <div className="login-laptop-topbar">
                                <img src={inventoryLogo} alt="" width={18} height={18} />
                                <span>Inventory</span>
                            </div>
                            <div className="login-laptop-body">
                                <div className="login-laptop-sidebar">
                                    <span className="login-laptop-sidebar-icon login-laptop-sidebar-icon--active"><BsGrid1X2 size={13} /></span>
                                    <span className="login-laptop-sidebar-icon"><BsBoxSeam size={13} /></span>
                                    <span className="login-laptop-sidebar-icon"><HiOutlineArrowDownTray size={13} /></span>
                                    <span className="login-laptop-sidebar-icon"><HiOutlineShoppingCart size={13} /></span>
                                    <span className="login-laptop-sidebar-icon"><HiOutlineClipboardDocumentList size={13} /></span>
                                </div>
                                {/* Two columns (not one long vertical stack) so the whole laptop reads as a
                                    landscape screen, not a tall portrait tablet. */}
                                <div className="login-laptop-main">
                                    <div className="login-laptop-col">
                                        <div className="login-laptop-stats-row">
                                            <div className="login-laptop-stat-card">
                                                <span className="login-laptop-stat-icon"><HiCube size={13} /></span>
                                                <span className="login-laptop-stat-text">
                                                    <span className="login-laptop-stat-label">Total Products</span>
                                                    <span className="login-laptop-stat-value">1,248</span>
                                                    <span className="login-laptop-line login-laptop-line--tiny" />
                                                </span>
                                            </div>
                                            <div className="login-laptop-stat-card">
                                                <span className="login-laptop-stat-text">
                                                    <span className="login-laptop-stat-label">Total Stock</span>
                                                    <span className="login-laptop-stat-value">
                                                        32
                                                        <HiOutlineExclamationTriangle size={12} className="login-laptop-stat-warn" />
                                                    </span>
                                                    <span className="login-laptop-line login-laptop-line--tiny" />
                                                </span>
                                            </div>
                                        </div>
                                        <div className="login-laptop-chart-card">
                                            <span className="login-laptop-chart-title">Stock Overview</span>
                                            <svg className="login-laptop-sparkline" viewBox="0 0 100 100" preserveAspectRatio="none">
                                                {chartGridlineX.map((x) => (
                                                    <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4" vectorEffect="non-scaling-stroke" />
                                                ))}
                                                <polyline points={stockOverviewPolyline} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                                                {stockOverviewPoints.map(([x, y]) => (
                                                    <circle key={x} cx={x} cy={y} r="3" fill="#2563eb" stroke="#ffffff" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                                                ))}
                                            </svg>
                                        </div>
                                    </div>

                                    <div className="login-laptop-col">
                                        <div className="login-laptop-chart-card">
                                            <span className="login-laptop-chart-title">Stock Report</span>
                                            <div className="login-laptop-bars login-laptop-bars--tall">
                                                {stockReportBars.map((height, index) => (
                                                    <span key={index} className="login-laptop-bar" style={{ height: `${height}%` }} />
                                                ))}
                                            </div>
                                        </div>

                                        <div className="login-laptop-activity-card">
                                            <span className="login-laptop-chart-title">Recent Activity</span>
                                            <div className="login-activity-list">
                                                {recentActivity.map((row) => (
                                                    <div className="login-activity-row" key={row.title}>
                                                        <span className={`login-activity-icon login-activity-icon--${row.tone}`}>
                                                            <row.icon size={13} />
                                                        </span>
                                                        <span className="login-activity-text">
                                                            <span className="login-activity-title">{row.title}</span>
                                                            <span className="login-activity-subtitle">{row.subtitle}</span>
                                                        </span>
                                                        <span className="login-activity-time">{row.time}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="login-badge login-badge--pill login-badge--orders">
                        <span className="login-badge-icon login-badge-icon--dark"><HiOutlineShoppingCart size={16} /></span>
                        <span className="login-badge-text">
                            <strong>Orders</strong>
                            <span>12 New</span>
                        </span>
                    </div>

                    <div className="login-boxes">
                        <div className="login-cube-cluster">
                            <Box3D className="login-cube3d login-cube3d--1" front="#3b82f6" right="#1e40af" top="#93c5fd" />
                            <Box3D className="login-cube3d login-cube3d--2" front="#2563eb" right="#1e3a8a" top="#60a5fa" />
                            <Box3D className="login-cube3d login-cube3d--3" front="#60a5fa" right="#2563eb" top="#bfdbfe" />
                        </div>
                        <div className="login-carton-cluster">
                            <Box3D className="login-carton login-carton--1" front="#ea9c3d" right="#b8721f" top="#fcd9a3" />
                            <Box3D className="login-carton login-carton--2" front="#f0b168" right="#c98a3a" top="#fde8c8" />
                        </div>
                        <span className="login-pallet-glow" />
                    </div>

                    <div className="login-plant">
                        <span className="login-plant-leaf login-plant-leaf--1" />
                        <span className="login-plant-leaf login-plant-leaf--2" />
                        <span className="login-plant-leaf login-plant-leaf--3" />
                        <span className="login-plant-leaf login-plant-leaf--4" />
                        <span className="login-plant-pot" />
                    </div>
                </div>
            </div>
        </div>
    );
};
export default Login;
