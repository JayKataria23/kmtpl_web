import { Navigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return <Navigate to="/sign-in" />;
  }

  return children;
};

export default ProtectedRoute;
