import React from "react";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "@/components/ui/sonner";

import Home from "@/pages/Home";
import Downloads from "@/pages/Downloads";
import News from "@/pages/News";
import NewsDetail from "@/pages/NewsDetail";
import Changelog from "@/pages/Changelog";
import Architecture from "@/pages/Architecture";
import Docs from "@/pages/Docs";
import Security from "@/pages/Security";

import AdminLogin from "@/pages/admin/Login";
import AdminDashboard from "@/pages/admin/Dashboard";
import AdminPosts from "@/pages/admin/Posts";
import AdminChangelogs from "@/pages/admin/Changelogs";
import AdminReleases from "@/pages/admin/Releases";
import AdminSystem from "@/pages/admin/System";
import AdminDocs from "@/pages/admin/Docs";
import AdminUsers from "@/pages/admin/Users";
import AdminSecurity from "@/pages/admin/Security";

function withLayout(Page) {
    return (
        <Layout>
            <Page />
        </Layout>
    );
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    {/* Public */}
                    <Route path="/" element={withLayout(Home)} />
                    <Route path="/downloads" element={withLayout(Downloads)} />
                    <Route path="/news" element={withLayout(News)} />
                    <Route path="/news/:slug" element={withLayout(NewsDetail)} />
                    <Route path="/changelog" element={withLayout(Changelog)} />
                    <Route path="/architecture" element={withLayout(Architecture)} />
                    <Route path="/docs" element={withLayout(Docs)} />
                    <Route path="/security" element={withLayout(Security)} />

                    {/* Admin */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/posts"
                        element={
                            <ProtectedRoute>
                                <AdminPosts />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/changelogs"
                        element={
                            <ProtectedRoute>
                                <AdminChangelogs />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/docs"
                        element={
                            <ProtectedRoute>
                                <AdminDocs />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/releases"
                        element={
                            <ProtectedRoute>
                                <AdminReleases />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/users"
                        element={
                            <ProtectedRoute>
                                <AdminUsers />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/security"
                        element={
                            <ProtectedRoute>
                                <AdminSecurity />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/system"
                        element={
                            <ProtectedRoute>
                                <AdminSystem />
                            </ProtectedRoute>
                        }
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
                <Toaster theme="dark" />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
