// // In any screen, add temporarily:
// import { useOrganizationsStore } from "@/store/organizationsStore";
// import { useAuth } from "@clerk/clerk-expo";
// import { useEffect, useState } from "react";
// import { Text, View } from "react-native";

// export function TestScreen() {
//   const { userId } = useAuth();
//   const { userOrgs, allOrgs, fetchUserOrgs, fetchAllOrgs } =
//     useOrganizationsStore();
//   const [isLoading, setIsLoading] = useState(false);
//   useEffect(() => {
//     setIsLoading(true);
//     if (userId) {
//       console.log("Testing orgs...");
//       fetchUserOrgs(userId);
//       fetchAllOrgs(userId);
//     }
//   }, [userId]);

//   useEffect(() => {
//     console.log("User Orgs:", userOrgs);
//     console.log("All Orgs:", allOrgs);
//   }, [userOrgs, allOrgs]);

//   return (
//     <View style={{ padding: 20 }}>
//       <Text>Check console for org data</Text>
//       <Text>User Orgs: {userOrgs.length}</Text>
//       <Text>All Orgs: {allOrgs.length}</Text>
//     </View>
//   );
// }
