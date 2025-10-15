import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const Room = () => {
  const { guid } = useParams<{ guid: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (guid) {
      // Check if user has entered their name
      const userName = localStorage.getItem('singtube_user_name');
      
      if (!userName || userName.trim().length < 2) {
        // Redirect back to join page if no name
        navigate(`/join/${guid}`, { replace: true });
        return;
      }

      // Redirect to home page with share parameter
      navigate(`/?share=${guid}`, { replace: true });
    } else {
      // If no GUID, redirect to home
      navigate("/", { replace: true });
    }
  }, [guid, navigate]);

  // This component doesn't render anything since it just redirects
  return null;
};

export default Room;