import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const Join = () => {
  const { guid } = useParams<{ guid: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (guid) {
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

export default Join;