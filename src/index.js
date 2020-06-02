import React, {useState, useEffect} from "react";
import ReactDOM from "react-dom";
import App from "./containers/App";
import Config from "./config";
import {getUserFromJwt} from "./lib/identityActions";
import "./index.css";
import registerServiceWorker from "./registerServiceWorker";
import OneGraphApolloClient from "onegraph-apollo-client";
import {ApolloProvider} from "react-apollo";
import api from "./lib/apiGraphQL";
import {getCookieValue, setCookie, deleteCookie} from "./lib/cookies";

const apolloClient = new OneGraphApolloClient({
  oneGraphAuth: Config.auth,
});

function Index() {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setLogin] = useState(getCookieValue("isLoggedIn") === "true");
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    const auth = Config.auth;
    auth.isLoggedIn("github").then(isLoggedIn => {
      if (isLoggedIn) {
        setCookie("isLoggedIn", "true");

        const user = getUserFromJwt(auth);
        setUser(user);
        setLogin(true);
        api
          .fetchMemberStatus()
          .then(res => {
            const viewerIsAMember = res.data.gitHub.viewer.organization === null ? false : true;
            setIsAdmin(viewerIsAMember);
          })
          .catch(e => {
            console.log(e);
          });
        return user;
      } else {
        console.warn("User is not logged into GitHub");
      }
    });
  }, []);

  const _handleLogIn = () => {
    const auth = Config.auth;
    auth
      .login("github")
      .then(() => {
        auth.isLoggedIn("github").then(isLoggedIn => {
          if (isLoggedIn) {
            // Pull the user-data we care about from the JWT and
            // store it in component local state for the rest of the
            // app
            const user = getUserFromJwt(auth);
            setUser(user);
            setCookie("isLoggedIn", "true");
          } else {
            console.warn("User did not grant auth for GitHub");
          }
        });
      })
      .catch(e => console.error("Problem logging in", e));
  };

  const _handleLogOut = () => {
    const auth = Config.auth;
    auth.logout("github").then(() => {
      // Remove the local onegraph-auth storage
      localStorage.removeItem("oneGraph:" + Config.appId);
      // Remove the local AdminStats bar status storage
      localStorage.removeItem("adminBar");
      setUser(null);
      deleteCookie("isLoggedIn");
    });
  };

  return (
    <div>
      <ApolloProvider client={apolloClient}>
        <App
          user={user}
          isLoggedIn={isLoggedIn}
          isAdmin={isAdmin}
          userId={user && user.id}
          handleLogIn={() => _handleLogIn()}
          handleLogOut={() => _handleLogOut()}
        />
      </ApolloProvider>
    </div>
  );
}

ReactDOM.render(<Index />, document.getElementById("root"));

registerServiceWorker();
