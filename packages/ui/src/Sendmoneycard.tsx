import React from "react";
import { motion } from "framer-motion";
import {PersonListItem} from "./PersonListItem";
import { Search } from "lucide-react";
import { useState,useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";



export const SendMoneyCard = ({ onSendMoney,setFriendRefresh,setPeople,setRefresh, onAddFriend,people,query,setQuery, loading,setLoading }: { onSendMoney: (person: any) => void; onAddFriend: (to: string) => Promise<"error"|"success">; people: any[]; query:string|undefined ; setQuery: (query: string) => void ; setPeople: (people: any[]) => void ;setRefresh: (refresh: boolean| ((prev: boolean) => boolean)) => void; setFriendRefresh: (refresh: boolean| ((prev: boolean) => boolean)) => void;loading:boolean,setLoading:(loading:boolean)=>void}) => {
 

    
    
useEffect(() => {
   
  
       
    const debounce = setTimeout(async () => {
      
 
        if(query && query.length>0){
            setLoading(true);
            const foundusers = await axios.get(`/api/p2p/search?query=${query}`).then(res => res.data);
            console.log(foundusers);
            setPeople(foundusers);
            setLoading(false);    
        }
        
    }, 500);
    return () =>{
        clearTimeout(debounce);
        
    };
    
}, [query]);    
    return (
        <div className={`w-full h-auto max-h-full bg-white rounded-2xl    shadow-lg flex flex-col overflow-hidden`}>
            <div className="p-6 max-sm:p-2 border-b">
                <h2 className="text-xl  max-sm:text-sm font-bold text-gray-800 mb-4 max-sm:mb-1">Send & Request</h2>
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or number"
                        className="w-full bg-gray-100  max-sm:text-sm  border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-full py-3 pl-12 pr-4  outline-none transition-all duration-300"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        />
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 max-sm:p-2 space-y-1">
                {people.length === 0&& query?.length! >0 && !loading && (
                    <div className="text-center text-sm text-gray-500 py-6">no results found</div>
                )}
                {people.length === 0&&query?.length===0 && !loading && (
                    <div className="text-center text-sm text-gray-500 py-6">add people to send money</div>
                )}

                {loading && (
                    <div className="text-center text-sm text-gray-500 py-6">loading...</div>
                )}
                {!loading &&
                    people.map((person: any) => (
                        
                        <PersonListItem
                        setRefresh={setRefresh}
                        setFriendRefresh={setFriendRefresh}
                         setQuery={setQuery}
                
                            key={person.id}
                            person={person}
                            onAddFriend={onAddFriend}
                            onSendMoney={onSendMoney}
                        />
                    ))}
            </div>
        </div>
    );
};